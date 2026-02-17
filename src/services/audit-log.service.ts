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
  ): Promise<AuditLog | null> {
    try {
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
      return await this.auditLogRepository.save(log);
    } catch (error) {
      // Si falla por foreign key (usuario no existe), solo logueamos el warning
      if (error.code === '23503') {
        console.warn(`[AuditLogService] User ${userId} not found, skipping audit log`);
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
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

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
