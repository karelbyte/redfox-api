import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InMemoryImportQueue } from './in-memory-import.queue';

export interface ClientImportJob {
  type: 'client';
  rows: any[];
  userId: string;
  organizationId: string;
}

export interface ProductImportJob {
  type: 'product';
  rows: any[];
  userId: string;
  organizationId: string;
}

export interface ProviderImportJob {
  type: 'provider';
  rows: any[];
  userId: string;
  organizationId: string;
}

export type ImportJob = ClientImportJob | ProductImportJob | ProviderImportJob;

@Injectable()
export class ImportQueue {
  private readonly logger = new Logger(ImportQueue.name);
  private readonly useRedis: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly inMemoryQueue: InMemoryImportQueue,
    @Optional() @InjectQueue('import') private readonly bullQueue?: Queue,
  ) {
    const cacheType = this.configService.get<string>('CACHE_TYPE', 'memory');
    this.useRedis = cacheType === 'redis' && !!this.bullQueue;

    if (this.useRedis) {
      this.logger.log('🔴 Import queue strategy: REDIS (Bull)');
    } else {
      this.logger.log('💾 Import queue strategy: IN-MEMORY');
    }
  }

  async addImportJob(job: ImportJob): Promise<void> {
    if (this.useRedis && this.bullQueue) {
      await this.bullQueue.add('process-import', job, {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
        timeout: 30 * 60 * 1000,
      });
    } else {
      await this.inMemoryQueue.addImportJob(job);
    }
  }
}
