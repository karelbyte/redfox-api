import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from '../services/notification.service';
import { NotificationController } from '../controllers/notification.controller';
import { Notification } from '../models/notification.entity';
import { TenantContext } from '../services/tenant-context.service';
import { OverdueAccountsSchedulerService } from '../services/overdue-accounts-scheduler.service';
import { AccountReceivable } from '../models/account-receivable.entity';
import { User } from '../models/user.entity';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, AccountReceivable, User]),
    LanguageModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    TenantContext,
    OverdueAccountsSchedulerService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
