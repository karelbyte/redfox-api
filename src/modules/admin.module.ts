import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from '../controllers/admin.controller';
import { AdminService } from '../services/admin.service';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { Organization } from '../models/organization.entity';
import { Subscription } from '../models/subscription.entity';
import { Plan } from '../models/plan.entity';
import { User } from '../models/user.entity';
import { Language } from '../models/language.entity';
import { TranslationService } from '../services/translation.service';
import { BullModule } from '@nestjs/bull';
import { AdminQueueService } from '../services/admin-queue.service';

import { AuthModule } from './auth.module';
import { LanguageModule } from './language.module';
import { SubscriptionModule } from './subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Subscription, Plan, User, Language]),
    AuthModule,
    LanguageModule,
    SubscriptionModule,
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'generate-cfdi' },
      { name: 'import' }
    ),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminQueueService, SuperAdminGuard, TranslationService],
})
export class AdminModule {}
