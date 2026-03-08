import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../services/tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private readonly tenantContext: TenantContext) { }

    use(req: Request, res: Response, next: NextFunction) {
        // Initialize the store for this request
        this.tenantContext.run({ organizationId: null, tenantSlug: null }, () => {
            next();
        });
    }
}
