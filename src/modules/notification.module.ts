import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from '../services/notification.service';
import { NotificationController } from '../controllers/notification.controller';
import { Notification } from '../models/notification.entity';
import { TenantContext } from '../services/tenant-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [NotificationService, TenantContext],
  exports: [NotificationService],
})
export class NotificationModule {}
