import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthRequest } from './auth.types.js';
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if(context.switchToHttp().getRequest<AuthRequest>().user?.role !== 'ADMIN')throw new ForbiddenException('Esta operación requiere un administrador.');
    return true;
  }
}
