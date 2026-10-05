import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { bodyObject, text, email, uuid } from '../common/validation.js';
import { AuthUser, mapUser } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService, private readonly jwt: JwtService, private readonly config: ConfigService) {}
  async login(body: unknown) {
    const input = bodyObject(body,['email','password','remember','workshopId']);
    const loginEmail = email(text(input,'email',150,true));
    const password = typeof input.password === 'string' ? input.password : '';
    if (!password || Buffer.byteLength(password)>72) throw new UnauthorizedException('Correo, contraseña o taller incorrectos.');
    const workshopId = text(input,'workshopId',36);
    if (workshopId) uuid(workshopId);
    const result = await this.db.query('SELECT u.* FROM users u JOIN workshops w ON w.id=u.workshop_id WHERE lower(u.email)=$1 AND u.active AND w.active AND ($2::uuid IS NULL OR u.workshop_id=$2::uuid) LIMIT 2',[loginEmail,workshopId || null]);
    const row = result.rows[0];
    // Comparación de coste equivalente cuando el usuario no existe.
    const fallback = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxY5FYXGRIdRJOJCNLHxLsyHoYu';
    const matches = await compare(password,row?.password_hash ?? fallback);
    if (result.rows.length !== 1 || !matches) throw new UnauthorizedException('Correo, contraseña o taller incorrectos.');
    const user = mapUser(row);
    const expiresIn = input.remember === true ? 604800 : 28800;
    const accessToken = await this.jwt.signAsync({sub:user.id,workshopId:user.workshopId},{expiresIn});
    return {user,accessToken,expiresIn};
  }
  async session(id: string, workshopId: string) {
    const result = await this.db.query('SELECT u.* FROM users u JOIN workshops w ON w.id=u.workshop_id WHERE u.id=$1 AND u.workshop_id=$2 AND u.active AND w.active',[uuid(id),uuid(workshopId)]);
    if (!result.rows[0]) throw new UnauthorizedException('Tu sesión ya no está activa.');
    return mapUser(result.rows[0]);
  }
  async me(user: AuthUser) {
    const result = await this.db.query('SELECT id,name,rut,phone,email,address,logo_url,business_hours,preferences FROM workshops WHERE id=$1 AND active',[user.workshopId]);
    const w = result.rows[0];
    return {user,workshop:{id:w.id,workshopId:w.id,name:w.name,rut:w.rut??'',phone:w.phone??'',email:w.email??'',address:w.address??'',logo:w.logo_url??'',hours:typeof w.business_hours === 'string' ? w.business_hours : (w.business_hours?.text ?? ''),preference:w.preferences?.regional ?? 'Kilómetros · CLP'}};
  }
  async updateProfile(user: AuthUser, body: unknown) {
    const input=bodyObject(body,['name','email','phone','specialty','avatarUrl']);
    const name=text(input,'name',201,true), parts=name.split(/\s+/);
    const firstName=parts.shift()!,lastName=parts.join(' ');
    if(firstName.length>100 || lastName.length>100) throw new BadRequestException('El nombre supera el largo permitido.');
    const avatar=text(input,'avatarUrl',1500000);
    if(avatar && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)) throw new BadRequestException('Foto inválida.');
    try {
      const r=await this.db.query('UPDATE users SET first_name=$1,last_name=$2,email=$3,phone=$4,specialty=$5,profile_photo_url=$6,updated_at=now() WHERE id=$7 AND workshop_id=$8 RETURNING *',[firstName,lastName,email(text(input,'email',150,true)),text(input,'phone',30,true),text(input,'specialty',150),avatar||null,user.id,user.workshopId]);
      return mapUser(r.rows[0]);
    } catch(e) { if((e as {code?:string}).code==='23505')throw new ConflictException('Ese correo ya pertenece a otro usuario del taller.');throw e; }
  }
  async preferences(user:AuthUser,body:unknown) {
    const input=bodyObject(body,['theme']);
    if(input.theme!=='light' && input.theme!=='dark')throw new BadRequestException('Tema inválido.');
    await this.db.query('UPDATE users SET theme=$1 WHERE id=$2 AND workshop_id=$3',[input.theme,user.id,user.workshopId]);
    return {theme:input.theme};
  }
  async setupStatus() { const r=await this.db.query('SELECT EXISTS(SELECT 1 FROM users) AS configured');return {setupRequired:!r.rows[0].configured}; }
  async setup(body: unknown) {
    const input=bodyObject(body,['setupToken','workshopName','firstName','lastName','email','password']);
    const token=text(input,'setupToken',200,true),expected=this.config.get<string>('SETUP_TOKEN') ?? '';
    const a=Buffer.from(token),b=Buffer.from(expected);
    if(!expected || a.length!==b.length || !timingSafeEqual(a,b))throw new UnauthorizedException('Código de configuración inválido.');
    const password=typeof input.password==='string'?input.password:'';
    if(password.length<12 || Buffer.byteLength(password)>72)throw new BadRequestException('La contraseña debe tener al menos 12 caracteres y hasta 72 bytes.');
    const workshopName=text(input,'workshopName',150,true), firstName=text(input,'firstName',100,true), lastName=text(input,'lastName',100,true), loginEmail=email(text(input,'email',150,true));
    const passwordHash=await hash(password,12);
    await this.db.transaction(async client=>{
      await client.query('SELECT pg_advisory_xact_lock(73184912)');
      const configured=await client.query('SELECT EXISTS(SELECT 1 FROM users) AS configured');
      if(configured.rows[0].configured)throw new ConflictException('El administrador inicial ya fue creado.');
      const workshop=await client.query('INSERT INTO workshops (name) VALUES ($1) RETURNING id',[workshopName]);
      await client.query("INSERT INTO users (workshop_id,first_name,last_name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5,'ADMIN')",[workshop.rows[0].id,firstName,lastName,loginEmail,passwordHash]);
    });
    return {message:'Taller y administrador creados. Ya puedes iniciar sesión.'};
  }
}
