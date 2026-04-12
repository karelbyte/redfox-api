import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InMemoryEmailQueue } from './in-memory-email.queue';

export interface EmailJob {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  organizationId?: string;
}

/**
 * Facade that delegates to either Bull/Redis or InMemoryEmailQueue
 * based on CACHE_TYPE environment variable.
 *
 * - CACHE_TYPE=redis  → uses Bull queue (requires @nestjs/bull, bull, and Redis)
 * - CACHE_TYPE=memory → uses in-memory queue (default, no external deps)
 */
@Injectable()
export class EmailQueue {
  private readonly logger = new Logger(EmailQueue.name);
  private readonly useRedis: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly inMemoryQueue: InMemoryEmailQueue,
    @Optional() @Inject('BULL_EMAIL_QUEUE') private readonly bullQueue?: any,
  ) {
    const cacheType = this.configService.get<string>('CACHE_TYPE', 'memory');
    this.useRedis = cacheType === 'redis' && !!this.bullQueue;

    if (this.useRedis) {
      this.logger.log('🔴 Email queue strategy: REDIS (Bull)');
    } else {
      this.logger.log('💾 Email queue strategy: IN-MEMORY');
      if (cacheType === 'redis' && !this.bullQueue) {
        this.logger.warn(
          '⚠️ CACHE_TYPE=redis but Bull queue is not available. Falling back to in-memory.',
        );
      }
    }
  }

  async addEmailJob(emailData: EmailJob): Promise<void> {
    if (this.useRedis) {
      await this.bullQueue.add('send-email', emailData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } else {
      await this.inMemoryQueue.addEmailJob(emailData);
    }
  }

  async addBulkEmailJobs(emails: EmailJob[]): Promise<void> {
    if (this.useRedis) {
      const jobs = emails.map((email) => ({
        name: 'send-email',
        data: email,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }));
      await this.bullQueue.addBulk(jobs);
    } else {
      await this.inMemoryQueue.addBulkEmailJobs(emails);
    }
  }
}
