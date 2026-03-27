import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Acceso denegado');

    const roles: string[] = user.roles ?? [];
    if (!roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Solo administradores del sistema pueden acceder a este recurso');
    }

    return true;
  }
}
