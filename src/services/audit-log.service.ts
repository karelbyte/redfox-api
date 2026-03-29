import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../models/audit-log.entity';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private readonly tenantContext: TenantContext,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    this.logger.log('Starting audit log cleanup (90 days retention)...');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    try {
      const result = await this.auditLogRepository.delete({
        created_at: LessThan(ninetyDaysAgo),
      });
      this.logger.log(`Cleanup finished. Removed ${result.affected} records.`);
    } catch (error) {
      this.logger.error('Error during audit log cleanup', error.stack);
    }
  }

  async log(
    userId: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    description?: string,
    ipAddress?: string,
    organizationIdFallback?: string,
  ): Promise<AuditLog | null> {
    try {
      const organizationId = this.tenantContext.getOrganizationId() || organizationIdFallback;

      if (!organizationId) {
        // En algunos casos de sistema (cron) no hay contexto, usamos el fallback si existe
        if (!organizationIdFallback) {
          this.logger.warn(
            `Skipping audit log for ${action} ${entityType}: No organization context.`,
          );
          return null;
        }
      }

      const log = this.auditLogRepository.create({
        organization_id: organizationId || organizationIdFallback,
        userId,
        entityType,
        entityId,
        action,
        oldValues,
        newValues,
        description,
        ipAddress,
      });
      return await this.auditLogRepository.save(log);
    } catch (error) {
      // Si falla por foreign key (usuario no existe), solo logueamos el warning
      if (error.code === '23503' || error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.warn(
          `[AuditLogService] User ${userId} not found, skipping audit log`,
        );
        return null;
      }
      // Para otros errores, los re-lanzamos
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    entityType?: string,
    action?: AuditAction,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ data: AuditLog[]; meta: any }> {
    const organizationId = this.tenantContext.getOrganizationId();

    if (!organizationId) {
      this.logger.warn('No organization context for findAll audit logs');
      return { data: [], meta: { currentPage: page, totalPages: 0, totalItems: 0, itemsPerPage: limit } };
    }

    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.organization', 'organization')
      .where('log.organization_id = :organizationId', { organizationId });

    if (entityType) {
      query.andWhere('log.entityType = :entityType', { entityType });
    }

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (userId) {
      query.andWhere('log.userId = :userId', { userId });
    }

    if (startDate) {
      query.andWhere('log.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('log.created_at <= :endDate', { endDate });
    }

    const [data, total] = await query
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    const organizationId = this.tenantContext.getOrganizationId();

    if (!organizationId) {
      this.logger.warn('No organization context for findByEntity audit logs');
      return [];
    }

    return this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.organization_id = :organizationId', { organizationId })
      .andWhere('log.entityType = :entityType', { entityType })
      .andWhere('log.entityId = :entityId', { entityId })
      .orderBy('log.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    const organizationId = this.tenantContext.getOrganizationId();

    if (!organizationId) {
      this.logger.warn('No organization context for findByUser audit logs');
      return [];
    }

    return this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.organization_id = :organizationId', { organizationId })
      .andWhere('log.userId = :userId', { userId })
      .orderBy('log.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  async findByAction(
    action: AuditAction,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.action = :action', { action })
      .orderBy('log.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('log.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  async getStats(entityType: string): Promise<any> {
    const stats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.entityType = :entityType', { entityType })
      .groupBy('log.action')
      .getRawMany();

    return stats;
  }
}
