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

  constructor(
    private dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {
    dataSource.subscribers.push(this);
  }

  // No auditamos la propia tabla de logs para prevenir bucles infinitos
  listenTo() {
    return 'all'; // Escuchamos todas las entidades
  }

  async afterInsert(event: InsertEvent<any>) {
    if (event.metadata.name === 'AuditLog') return;
    
    await this.auditLogService.log(
      event.entity?.created_by || 'SYSTEM', // Usamos campos comunes si existen
      event.metadata.name,
      event.entity?.id || 'N/A',
      AuditAction.CREATE,
      undefined,
      event.entity,
      `Created ${event.metadata.name}`,
    );
  }

  async afterUpdate(event: UpdateEvent<any>) {
    if (event.metadata.name === 'AuditLog') return;

    await this.auditLogService.log(
      event.entity?.updated_by || 'SYSTEM',
      event.metadata.name,
      event.entity?.id || 'N/A',
      AuditAction.UPDATE,
      event.databaseEntity, // Valores anteriores
      event.entity,         // Valores nuevos
      `Updated ${event.metadata.name}`,
    );
  }

  async afterRemove(event: RemoveEvent<any>) {
    if (event.metadata.name === 'AuditLog') return;

    await this.auditLogService.log(
      'SYSTEM', // En el remove a veces no tenemos el usuario en la entidad
      event.metadata.name,
      event.entityId || 'N/A',
      AuditAction.DELETE,
      event.databaseEntity,
      undefined,
      `Deleted ${event.metadata.name}`,
    );
  }
}
