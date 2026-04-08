import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ImportJob } from './import.queue';

/**
 * In-memory import queue — processes import jobs asynchronously
 * without blocking the HTTP response.
 * The actual processing is delegated to ClientImportService / ProductImportService
 * via a registered processor callback.
 */
@Injectable()
export class InMemoryImportQueue implements OnModuleDestroy {
  private readonly logger = new Logger(InMemoryImportQueue.name);
  private queue: ImportJob[] = [];
  private processing = false;
  private processor: ((job: ImportJob) => Promise<void>) | null = null;
  private timeoutRef: ReturnType<typeof setTimeout> | null = null;

  onModuleDestroy() {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }
    this.logger.log(
      `🛑 Import queue shutting down. ${this.queue.length} jobs pending.`,
    );
  }

  /**
   * Register the processor function that handles each job.
   * Called once during module initialization.
   */
  registerProcessor(fn: (job: ImportJob) => Promise<void>): void {
    this.processor = fn;
    this.logger.log('✅ Import queue processor registered');
  }

  async addImportJob(job: ImportJob): Promise<void> {
    this.queue.push(job);
    this.logger.log(
      `📥 Import job queued: type=${job.type} rows=${job.rows.length} org=${job.organizationId}`,
    );
    this.scheduleProcessing();
  }

  private scheduleProcessing(): void {
    if (this.processing) return;
    this.timeoutRef = setTimeout(() => this.processQueue(), 0);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await this.processJob(job);
    }

    this.processing = false;
  }

  private async processJob(job: ImportJob): Promise<void> {
    if (!this.processor) {
      this.logger.error('❌ No processor registered for import queue');
      return;
    }

    this.logger.log(
      `⚙️ Processing import job: type=${job.type} rows=${job.rows.length}`,
    );
    try {
      await this.processor(job);
      this.logger.log(`✅ Import job completed: type=${job.type}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Import job failed: ${error?.message}`,
        error?.stack,
      );
    }
  }
}
