import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from '../models/webhook.entity';
import { WebhookService } from '../services/webhook.service';
import { WebhookController } from '../controllers/webhook.controller';
import { TenantContext } from '../services/tenant-context.service';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook])],
  controllers: [WebhookController],
  providers: [WebhookService, TenantContext, TenantInterceptor],
  exports: [WebhookService],
})
export class WebhookModule {}