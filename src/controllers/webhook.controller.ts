import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { WebhookService } from '../services/webhook.service';
import { Webhook } from '../models/webhook.entity';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('webhooks')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  async getWebhooks(@Req() request: any): Promise<Webhook[]> {
    const organizationId = request.user?.organizationId;
    return await this.webhookService.getWebhooks(organizationId);
  }

  @Post()
  async createWebhook(@Req() request: any, @Body() webhookData: Partial<Webhook>): Promise<Webhook> {
    const organizationId = request.user?.organizationId;
    return await this.webhookService.createWebhook(organizationId, webhookData);
  }

  @Put(':id')
  async updateWebhook(
    @Req() request: any,
    @Param('id') id: string,
    @Body() updates: Partial<Webhook>,
  ): Promise<Webhook | null> {
    const organizationId = request.user?.organizationId;
    return await this.webhookService.updateWebhook(id, organizationId, updates);
  }

  @Delete(':id')
  async deleteWebhook(@Req() request: any, @Param('id') id: string): Promise<void> {
    const organizationId = request.user?.organizationId;
    return await this.webhookService.deleteWebhook(id, organizationId);
  }
}