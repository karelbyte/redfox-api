import { Logger } from '@nestjs/common';
import { EmailService } from '../services/email.service';

interface EmailJob {
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
 * EmailProcessor for Bull/Redis queue.
 * Only used when CACHE_TYPE=redis and @nestjs/bull is installed.
 */
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  async handleSendEmail(job: { id: number | string; data: EmailJob }) {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);

    try {
      if (job.data.attachments) {
        job.data.attachments = this.ensureBuffers(job.data.attachments);
      }

      if (job.data.organizationId) {
        const result = await this.emailService.sendOrganizationEmail(
          job.data.organizationId,
          {
            to: job.data.to,
            subject: job.data.subject,
            html: job.data.html,
            attachments: job.data.attachments as any[],
          },
        );

        if (!result.sent) {
          throw new Error(
            `Email service returned failure for organization: ${job.data.organizationId}${!result.configured ? ' (Not configured/Active)' : ''}`,
          );
        }
      } else {
        const success = await this.emailService.sendSystemEmail(
          job.data.to,
          job.data.subject,
          job.data.html,
          job.data.attachments as any[],
        );

        if (!success) {
          throw new Error('System email service returned failure');
        }
      }

      this.logger.log(`Email sent successfully to ${job.data.to}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email to ${job.data.to}:`, error);
      throw error;
    }
  }

  /**
   * Bull/Redis serializes Buffers as { type: 'Buffer', data: number[] }.
   * This method restores them to actual Buffer instances.
   */
  private ensureBuffers(attachments: any[]): any[] {
    return attachments.map((att) => {
      if (
        att.content &&
        typeof att.content === 'object' &&
        att.content.type === 'Buffer' &&
        Array.isArray(att.content.data)
      ) {
        return {
          ...att,
          content: Buffer.from(att.content.data),
        };
      }
      return att;
    });
  }
}

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
}
