import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../models/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    userId: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    description?: string,
    ipAddress?: string,
  ): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      userId,
      entityType,
      entityId,
      action,
      oldValues,
      newValues,
      description,
      ipAddress,
    });
    return this.auditLogRepository.save(log);
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.entityType = :entityType', { entityType })
      .andWhere('log.entityId = :entityId', { entityId })
      .orderBy('log.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
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
