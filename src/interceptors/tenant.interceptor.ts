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
    constructor(private tenantContext: TenantContext) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const tenantSlug = request.params.tenant || request.headers['x-tenant-slug'];

        if (user && user.organizationId && this.tenantContext) {
            this.tenantContext.setOrganizationId(user.organizationId);
            request['organizationId'] = user.organizationId;
        }

        if (tenantSlug && this.tenantContext) {
            this.tenantContext.setTenantSlug(tenantSlug as string);
            // Optional: Validate that user.organization.slug matches tenantSlug
        }

        return next.handle();
    }
}
