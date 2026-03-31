import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
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

    if (user && user.organizationId && this.tenantContext) {
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

    return next.handle();
  }
}
