import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction } from '../models/audit-log.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger('AuditSubscriber');
  private readonly SUMMARY_FIELDS = [
    'id',
    'name',
    'code',
    'slug',
    'email',
    'phone',
    'sku',
    'folio',
  ];

  constructor(
    private dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {
    dataSource.subscribers.push(this);
  }

  private buildSnapshot(
    source: any,
    keys?: string[],
  ): Record<string, any> | undefined {
    if (!source || typeof source !== 'object') {
      return source;
    }

    const candidateKeys = keys?.length ? keys : Object.keys(source);
    const snapshot: Record<string, any> = {};

    for (const key of candidateKeys) {
      if (!(key in source)) continue;

      const value = source[key];
      if (value === undefined || typeof value === 'function') continue;

      snapshot[key] = this.normalizeSnapshotValue(value);
    }

    return Object.keys(snapshot).length ? snapshot : undefined;
  }

  private normalizeSnapshotValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.slice(0, 10).map((item) => this.summarizeReference(item));
    }

    return this.summarizeReference(value);
  }

  private summarizeReference(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return `[Array(${value.length})]`;
    }

    const summary: Record<string, any> = {};
    const entityName = value.constructor?.name;

    if (entityName && entityName !== 'Object') {
      summary.__entity = entityName;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue === undefined || typeof nestedValue === 'function') {
        continue;
      }

      const shouldKeepField =
        this.SUMMARY_FIELDS.includes(key) || key.endsWith('_id');

      if (!shouldKeepField) {
        continue;
      }

      if (nestedValue instanceof Date) {
        summary[key] = nestedValue.toISOString();
      } else if (typeof nestedValue !== 'object' || nestedValue === null) {
        summary[key] = nestedValue;
      }
    }

    return Object.keys(summary).length ? summary : `[${entityName || 'Object'}]`;
  }

  private getUpdatedKeys(event: UpdateEvent<any>): string[] {
    const keys = new Set<string>(['id', 'organization_id', 'updated_by']);

    for (const column of event.updatedColumns) {
      keys.add(column.propertyName);
    }

    return [...keys];
  }

  async afterInsert(event: InsertEvent<any>) {
    if (event.metadata.name === 'AuditLog') return;

    await this.auditLogService.log(
      event.entity?.created_by || 'SYSTEM', // Usamos campos comunes si existen
      event.metadata.name,
      event.entity?.id || 'N/A',
      AuditAction.CREATE,
      undefined,
      this.buildSnapshot(event.entity),
      `Created ${event.metadata.name}`,
    );
  }

  async afterUpdate(event: UpdateEvent<any>) {
    if (event.metadata.name === 'AuditLog') return;

    const updatedKeys = this.getUpdatedKeys(event);

    await this.auditLogService.log(
      event.entity?.updated_by || 'SYSTEM',
      event.metadata.name,
      event.entity?.id || 'N/A',
      AuditAction.UPDATE,
      this.buildSnapshot(event.databaseEntity, updatedKeys), // Valores anteriores
      this.buildSnapshot(event.entity, updatedKeys), // Valores nuevos
      `Updated ${event.metadata.name}`,
    );
  }

  async afterRemove(event: RemoveEvent<any>) {
    if (event.metadata.name === 'AuditLog') return;

    await this.auditLogService.log(
      'SYSTEM', // En el remove a veces no tenemos el usuario en la entidad, pero AuditLogService usará el TenantContext si lo hay
      event.metadata.name,
      event.entityId || 'N/A',
      AuditAction.DELETE,
      this.buildSnapshot(event.databaseEntity || event.entity),
      undefined,
      `Deleted ${event.metadata.name}`,
    );
  }
}
