import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EmailService } from '../services/email.service';

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface InMemoryJob {
  id: number;
  data: EmailJob;
  attempts: number;
  maxAttempts: number;
  backoffDelay: number;
  createdAt: Date;
}

@Injectable()
export class InMemoryEmailQueue implements OnModuleDestroy {
  private readonly logger = new Logger(InMemoryEmailQueue.name);
  private queue: InMemoryJob[] = [];
  private processing = false;
  private jobIdCounter = 0;
  private timeoutRef: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly emailService: EmailService) {
    this.logger.log('✅ In-memory email queue initialized');
  }

  onModuleDestroy() {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }
    this.logger.log(
      `🛑 In-memory queue shutting down. ${this.queue.length} jobs pending.`,
    );
  }

  async addEmailJob(emailData: EmailJob): Promise<void> {
    const job: InMemoryJob = {
      id: ++this.jobIdCounter,
      data: emailData,
      attempts: 0,
      maxAttempts: 3,
      backoffDelay: 2000,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.logger.log(`📩 Email job ${job.id} queued for ${emailData.to}`);
    this.scheduleProcessing();
  }

  async addBulkEmailJobs(emails: EmailJob[]): Promise<void> {
    for (const emailData of emails) {
      await this.addEmailJob(emailData);
    }
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

  private async processJob(job: InMemoryJob): Promise<void> {
    job.attempts++;
    this.logger.log(
      `⚙️ Processing email job ${job.id} to ${job.data.to} (attempt ${job.attempts}/${job.maxAttempts})`,
    );

    try {
      const success = await this.emailService.sendSystemEmail(
        job.data.to,
        job.data.subject,
        job.data.html,
      );

      if (!success) {
        throw new Error('EmailService returned false');
      }

      this.logger.log(
        `✅ Email sent successfully to ${job.data.to} (job ${job.id})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email to ${job.data.to} (job ${job.id}, attempt ${job.attempts}):`,
        error?.message || error,
      );

      if (job.attempts < job.maxAttempts) {
        const delay = job.backoffDelay * Math.pow(2, job.attempts - 1);
        this.logger.warn(`🔄 Retrying job ${job.id} in ${delay}ms...`);

        await new Promise<void>((resolve) => {
          this.timeoutRef = setTimeout(() => {
            this.queue.push(job);
            resolve();
          }, delay);
        });
      } else {
        this.logger.error(
          `💀 Job ${job.id} to ${job.data.to} failed after ${job.maxAttempts} attempts. Giving up.`,
        );
      }
    }
  }
}
