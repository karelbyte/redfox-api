import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TenantContext } from '../services/tenant-context.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private tenantContext: TenantContext,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantSlug =
      request.params.tenant || request.headers['x-tenant-slug'];

    // Los endpoints públicos (login, registro, etc.) no requieren organización.
    // Los SUPER_ADMIN del proyecto admin tampoco están atados a una organización.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const roles: string[] = user?.roles ?? [];
    const isSuperAdmin = roles.includes('SUPER_ADMIN');

    if (!isPublic && !isSuperAdmin && !user?.organizationId) {
      throw new ForbiddenException(
        'La petición requiere una organización activa.',
      );
    }

    if (user?.organizationId) {
      this.tenantContext.setOrganizationId(user.organizationId);
      request['organizationId'] = user.organizationId;
    }

    const userId = user?.id || user?.sub;
    if (userId && this.tenantContext) {
      this.tenantContext.setUserId(userId);
    }

    const ip = request.ip || request.connection?.remoteAddress;
    if (ip && this.tenantContext) {
      this.tenantContext.setIpAddress(ip);
    }

    if (tenantSlug && this.tenantContext) {
      this.tenantContext.setTenantSlug(tenantSlug as string);
    }

    // Guardar el locale del request para usarlo en traducciones
    const locale = request.headers['x-locale'] as string;
    if (locale && this.tenantContext) {
      this.tenantContext.setLocale(locale.split('-')[0].toLowerCase());
    }

    const country = user?.country;
    if (country && this.tenantContext) {
      this.tenantContext.setCountry(country);
    }

    return next.handle();
  }
}
