import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthRequest } from './auth.types.js';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService,private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request=context.switchToHttp().getRequest<AuthRequest>();
    const [type,token]=(request.headers.authorization ?? '').split(' ');
    if(type!=='Bearer'||!token)throw new UnauthorizedException('Inicia sesión para continuar.');
    try {
      const payload=await this.jwt.verifyAsync<{sub:string;workshopId:string}>(token,{algorithms:['HS256'],issuer:'otaller-api',audience:'otaller-web'});
      request.user=await this.auth.session(payload.sub,payload.workshopId);
    } catch { throw new UnauthorizedException('Sesión inválida o vencida.'); }
    return true;
  }
}
