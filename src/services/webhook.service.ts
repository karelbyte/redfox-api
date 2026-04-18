import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook, WebhookEvent, WebhookStatus } from '../models/webhook.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepository: Repository<Webhook>,
  ) {}

  async triggerWebhooks(organizationId: string, event: WebhookEvent, data: any): Promise<void> {
    try {
      const webhooks = await this.webhookRepository.find({
        where: {
          organization_id: organizationId,
          event,
          status: WebhookStatus.ACTIVE,
        },
      });

      if (webhooks.length === 0) {
        return;
      }

      const payload = {
        event,
        timestamp: new Date().toISOString(),
        organization_id: organizationId,
        data,
      };

      for (const webhook of webhooks) {
        await this.sendWebhook(webhook, payload);
      }
    } catch (error) {
      this.logger.error(`Error triggering webhooks for event ${event}:`, error);
    }
  }

  private async sendWebhook(webhook: Webhook, payload: any): Promise<void> {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nitro-ERP-Webhook/1.0',
          ...webhook.headers,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await this.updateWebhookSuccess(webhook);
        this.logger.log(`Webhook ${webhook.id} triggered successfully for event ${webhook.event}`);
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      await this.handleWebhookFailure(webhook, error);
    }
  }

  private async updateWebhookSuccess(webhook: Webhook): Promise<void> {
    await this.webhookRepository.update(webhook.id, {
      last_triggered_at: new Date(),
      failure_count: 0,
      last_error: null,
    });
  }

  private async handleWebhookFailure(webhook: Webhook, error: any): Promise<void> {
    const errorMessage = error.message || 'Unknown error';
    this.logger.warn(`Webhook ${webhook.id} failed: ${errorMessage}`);

    const newFailureCount = webhook.failure_count + 1;

    if (newFailureCount >= webhook.retry_count) {
      await this.webhookRepository.update(webhook.id, {
        status: WebhookStatus.FAILED,
        failure_count: newFailureCount,
        last_error: errorMessage,
      });
    } else {
      await this.webhookRepository.update(webhook.id, {
        failure_count: newFailureCount,
        last_error: errorMessage,
      });
    }
  }

  async createWebhook(organizationId: string, webhookData: Partial<Webhook>): Promise<Webhook> {
    const webhook = this.webhookRepository.create({
      ...webhookData,
      organization_id: organizationId,
    });
    return await this.webhookRepository.save(webhook);
  }

  async getWebhooks(organizationId: string): Promise<Webhook[]> {
    return await this.webhookRepository.find({
      where: { organization_id: organizationId },
      order: { created_at: 'DESC' },
    });
  }

  async updateWebhook(id: string, organizationId: string, updates: Partial<Webhook>): Promise<Webhook | null> {
    await this.webhookRepository.update(
      { id, organization_id: organizationId },
      updates,
    );
    return await this.webhookRepository.findOne({ where: { id } });
  }

  async deleteWebhook(id: string, organizationId: string): Promise<void> {
    await this.webhookRepository.delete({ id, organization_id: organizationId });
  }
}