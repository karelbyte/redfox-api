import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';

export interface QueueStats {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

@Injectable()
export class AdminQueueService {
  private readonly logger = new Logger(AdminQueueService.name);

  constructor(
    @Optional() @InjectQueue('email') private readonly emailQueue?: Queue,
    @Optional() @InjectQueue('generate-cfdi') private readonly cfdiQueue?: Queue,
    @Optional() @InjectQueue('import') private readonly importQueue?: Queue,
  ) {}

  private getQueueByName(name: string): Queue | undefined {
    switch (name) {
      case 'email':
        return this.emailQueue;
      case 'generate-cfdi':
        return this.cfdiQueue;
      case 'import':
        return this.importQueue;
      default:
        return undefined;
    }
  }

  async getAllQueueStats(): Promise<QueueStats[]> {
    const queues = [
      { name: 'email', instance: this.emailQueue },
      { name: 'generate-cfdi', instance: this.cfdiQueue },
      { name: 'import', instance: this.importQueue },
    ];

    const stats: QueueStats[] = [];

    for (const q of queues) {
      if (q.instance) {
        try {
          const counts = await q.instance.getJobCounts();
          const isPaused = await q.instance.isPaused();
          stats.push({
            name: q.name,
            ...counts,
            paused: isPaused,
          });
        } catch (error) {
          this.logger.error(`Error getting stats for queue ${q.name}: ${error.message}`);
        }
      }
    }

    return stats;
  }

  async getJobs(
    queueName: string,
    types: string[] = ['active', 'waiting', 'completed', 'failed', 'delayed'],
    page: number = 1,
    limit: number = 50,
  ): Promise<{ jobs: any[]; total: number }> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found or not initialized`);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const jobs = await queue.getJobs(types as any, start, end, true);
    const total = await queue.getJobCountByTypes(types as any);

    const formattedJobs = await Promise.all(
      jobs.map(async (job) => ({
        ...this.formatJob(job),
        state: await (job as any).getState(),
      }))
    );

    return {
      jobs: formattedJobs,
      total,
    };
  }

  async getJobById(queueName: string, jobId: string): Promise<any> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    return {
      ...this.formatJob(job),
      state: await (job as any).getState(),
    };
  }

  async retryJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    await job.retry();
  }

  async deleteJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    await job.remove();
  }

  async updateJobData(queueName: string, jobId: string, data: any): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    await job.update(data);
  }

  private formatJob(job: Job): any {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress(),
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }
}
