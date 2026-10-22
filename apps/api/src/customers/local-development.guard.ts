import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Temporal: sustituir por autenticación y permisos antes de publicar el módulo.
@Injectable()
export class LocalDevelopmentGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ socket: { remoteAddress?: string } }>();
    const address = request.socket.remoteAddress ?? '';
    if (this.config.get('NODE_ENV') === 'production' || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
      throw new ForbiddenException('Este módulo requiere autenticación antes de habilitarse fuera del desarrollo local.');
    }
    return true;
  }
}
