import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { hash } from "bcryptjs";
import { DatabaseService } from "../database/database.service.js";
import { AuthUser, mapUser } from "../auth/auth.types.js";
import { bodyObject, email, text, uuid } from "../common/validation.js";
@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}
  async findAll(user: AuthUser) {
    const result = await this.db.query(
      "SELECT * FROM users WHERE workshop_id=$1 ORDER BY first_name,last_name",
      [user.workshopId],
    );
    return result.rows.map(mapUser);
  }
  async save(user: AuthUser, body: unknown, id?: string) {
    const input = bodyObject(body, [
      "name",
      "email",
      "phone",
      "rut",
      "specialty",
      "role",
      "active",
      "avatarUrl",
      ...(id ? [] : ["password"]),
    ]);
    if (id) uuid(id);
    const names = text(input, "name", 201, true).split(/\s+/),
      first = names.shift()!,
      last = names.join(" ");
    if (first.length > 100 || last.length > 100)
      throw new BadRequestException("El nombre supera el largo permitido.");
    const loginEmail = email(text(input, "email", 150, true));
    if (!["ADMIN", "WORKER"].includes(String(input.role)))
      throw new BadRequestException("Rol inválido.");
    if (input.active !== undefined && typeof input.active !== "boolean")
      throw new BadRequestException("Estado inválido.");
    const active = input.active !== false,
      role = input.role === "WORKER" ? "MECHANIC" : "ADMIN";
    if (id === user.id && (!active || role !== "ADMIN"))
      throw new BadRequestException(
        "No puedes desactivar ni quitar el rol de tu propia cuenta.",
      );
    let passwordHash: string | undefined;
    if (!id) {
      const password = typeof input.password === "string" ? input.password : "";
      if (password.length < 12 || Buffer.byteLength(password) > 72)
        throw new BadRequestException(
          "La contraseña debe tener al menos 12 caracteres y hasta 72 bytes.",
        );
      passwordHash = await hash(password, 12);
    }
    const phone = text(input, "phone", 30),
      rut = text(input, "rut", 20),
      specialty = text(input, "specialty", 150);
    const suppliedAvatar =
      input.avatarUrl === undefined
        ? undefined
        : text(input, "avatarUrl", 1500000);
    if (
      suppliedAvatar &&
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
        suppliedAvatar,
      )
    )
      throw new BadRequestException("Foto inválida.");
    return this.db.transaction(async (client) => {
      let previousAvatar: string | null = null;
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [user.workshopId],
      );
      if (id) {
        const existing = await client.query(
          "SELECT id,profile_photo_url FROM users WHERE id=$1 AND workshop_id=$2",
          [id, user.workshopId],
        );
        if (!existing.rows[0])
          throw new NotFoundException("Usuario no encontrado en este taller.");
        previousAvatar = existing.rows[0].profile_photo_url;
      }
      const duplicate = await client.query(
        "SELECT id FROM users WHERE workshop_id=$1 AND lower(email)=$2 AND ($3::uuid IS NULL OR id<>$3::uuid)",
        [user.workshopId, loginEmail, id ?? null],
      );
      if (duplicate.rows[0])
        throw new ConflictException(
          "Ese correo ya pertenece a un usuario del taller.",
        );
      const values = [
        first,
        last,
        loginEmail,
        phone,
        rut,
        specialty,
        role,
        active,
        user.workshopId,
        suppliedAvatar === undefined ? previousAvatar : suppliedAvatar || null,
      ];
      const result = id
        ? await client.query(
            "UPDATE users SET first_name=$1,last_name=$2,email=$3,phone=$4,rut=$5,specialty=$6,role=$7,active=$8,profile_photo_url=$10,updated_at=now() WHERE workshop_id=$9 AND id=$11 RETURNING *",
            [...values, id],
          )
        : await client.query(
            "INSERT INTO users(first_name,last_name,email,phone,rut,specialty,role,active,workshop_id,profile_photo_url,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
            [...values, passwordHash],
          );
      return mapUser(result.rows[0]);
    });
  }
}
