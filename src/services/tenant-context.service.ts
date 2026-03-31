import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface TenantStore {
  organizationId: string | null;
  tenantSlug: string | null;
  pacConfig?: Record<string, any> | null;
  userId?: string | null;
  ipAddress?: string | null;
}

/**
 * TenantContext stores the current tenant's organizationId on a per-request basis
 * using AsyncLocalStorage for thread-safe per-request state isolation.
 */
@Injectable()
export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantStore>();

  run(store: TenantStore, callback: () => any) {
    return TenantContext.storage.run(store, callback);
  }

  setOrganizationId(id: string) {
    const store = TenantContext.storage.getStore();
    if (store) {
      store.organizationId = id;
    }
  }

  getOrganizationId(): string | null {
    return TenantContext.storage.getStore()?.organizationId || null;
  }

  setTenantSlug(slug: string) {
    const store = TenantContext.storage.getStore();
    if (store) {
      store.tenantSlug = slug;
    }
  }

  getTenantSlug(): string | null {
    return TenantContext.storage.getStore()?.tenantSlug || null;
  }

  setPacConfig(config: Record<string, any>) {
    const store = TenantContext.storage.getStore();
    if (store) {
      store.pacConfig = config;
    }
  }

  getPacConfig(): Record<string, any> | null {
    return TenantContext.storage.getStore()?.pacConfig || null;
  }

  setUserId(userId: string) {
    const store = TenantContext.storage.getStore();
    if (store) {
      store.userId = userId;
    }
  }

  getUserId(): string | null {
    return TenantContext.storage.getStore()?.userId || null;
  }

  setIpAddress(ipAddress: string) {
    const store = TenantContext.storage.getStore();
    if (store) {
      store.ipAddress = ipAddress;
    }
  }

  getIpAddress(): string | null {
    return TenantContext.storage.getStore()?.ipAddress || null;
  }

  clear() {
    const store = TenantContext.storage.getStore();
    if (store) {
      store.organizationId = null;
      store.tenantSlug = null;
      store.userId = null;
      store.ipAddress = null;
    }
  }
}
