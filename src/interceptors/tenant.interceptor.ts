import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../services/tenant-context.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private tenantContext: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantSlug =
      request.params.tenant || request.headers['x-tenant-slug'];

    // Todos los endpoints con contexto de tenant son estrictamente por organización.
    // El proyecto de administración usa sus propios endpoints /admin.
    if (!user?.organizationId) {
      throw new ForbiddenException(
        'La petición requiere una organización activa.',
      );
    }

    this.tenantContext.setOrganizationId(user.organizationId);
    request['organizationId'] = user.organizationId;

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
