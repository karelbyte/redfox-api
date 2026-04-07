import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportLog, ImportLogStatus, ImportLogType } from '../models/import-log.entity';

@Injectable()
export class ImportLogService {
  constructor(
    @InjectRepository(ImportLog)
    private readonly repo: Repository<ImportLog>,
  ) {}

  async createPending(
    type: ImportLogType,
    userId: string,
    organizationId: string,
    totalRows: number,
  ): Promise<ImportLog> {
    const log = this.repo.create({
      type,
      user_id: userId,
      organization_id: organizationId,
      status: ImportLogStatus.PENDING,
      total_rows: totalRows,
      started_at: new Date(),
    });
    return this.repo.save(log);
  }

  async complete(
    id: string,
    data: {
      created_count: number;
      skipped_count: number;
      error_count: number;
      pack_synced: number;
      pack_failed: number;
      summary: string;
      errors: any[];
      pack_warnings: any[];
    },
  ): Promise<void> {
    await this.repo.update(id, {
      status: ImportLogStatus.COMPLETED,
      ...data,
      completed_at: new Date(),
    });
  }

  async fail(id: string, errorMessage: string): Promise<void> {
    await this.repo.update(id, {
      status: ImportLogStatus.FAILED,
      summary: errorMessage,
      completed_at: new Date(),
    });
  }

  async findByOrg(
    organizationId: string,
    type: ImportLogType,
    limit = 10,
  ): Promise<ImportLog[]> {
    return this.repo.find({
      where: { organization_id: organizationId, type },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
