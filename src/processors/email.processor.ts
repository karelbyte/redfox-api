import { Logger } from '@nestjs/common';
import { EmailService } from '../services/email.service';

interface EmailJob {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * EmailProcessor for Bull/Redis queue.
 * Only used when CACHE_TYPE=redis and @nestjs/bull is installed.
 *
 * Note: This file uses dynamic decorator application to avoid
 * compile-time dependency on @nestjs/bull.
 */
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  async handleSendEmail(job: { id: number | string; data: EmailJob }) {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);

    try {
      await this.emailService.sendSystemEmail(
        job.data.to,
        job.data.subject,
        job.data.html,
      );

      this.logger.log(`Email sent successfully to ${job.data.to}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email to ${job.data.to}:`, error);
      throw error;
    }
  }
}

// Apply Bull decorators dynamically at runtime (only when @nestjs/bull is available)
try {
  const bull = require('@nestjs/bull');
  if (bull.Processor) {
    bull.Processor('email')(EmailProcessor);
  }
  if (bull.Process) {
    const descriptor = Object.getOwnPropertyDescriptor(
      EmailProcessor.prototype,
      'handleSendEmail',
    );
    if (descriptor) {
      bull.Process('send-email')(
        EmailProcessor.prototype,
        'handleSendEmail',
        descriptor,
      );
    }
  }
} catch {
  // @nestjs/bull not installed, decorators not applied — this is fine
}
