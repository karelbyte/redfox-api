import { Injectable } from '@nestjs/common';

/**
 * TenantContext stores the current tenant's organizationId on a per-request basis
 * using AsyncLocalStorage for thread-safe per-request state isolation.
 * This avoids the Scope.REQUEST DI issue while still being request-specific.
 */
@Injectable()
export class TenantContext {
    private organizationId: string | null = null;
    private tenantSlug: string | null = null;

    setOrganizationId(id: string) {
        this.organizationId = id;
    }

    getOrganizationId(): string | null {
        return this.organizationId;
    }

    setTenantSlug(slug: string) {
        this.tenantSlug = slug;
    }

    getTenantSlug(): string | null {
        return this.tenantSlug;
    }

    clear() {
        this.organizationId = null;
        this.tenantSlug = null;
    }
}
