import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentController } from '../controllers/shipment.controller';
import { ShipmentPublicController } from '../controllers/shipment-public.controller';
import { ShipmentService } from '../services/shipment.service';
import { Shipment } from '../models/shipment.entity';
import { Withdrawal } from '../models/withdrawal.entity';
import { ClientAddress } from '../models/client-address.entity';
import { Organization } from '../models/organization.entity';
import { CompanySettings } from '../models/company-settings.entity';
import { OrganizationModule } from './organization.module';
import { LanguageModule } from './language.module';
import { ShipmentNotificationService } from '../services/shipment-notification.service';
import { ShipmentSchedulerService } from '../services/shipment-scheduler.service';
import { BotSettingsModule } from './bot-settings.module';
import { NotificationModule } from './notification.module';
import { EmailModule } from './email.module';
import { User } from '../models/user.entity';
import { BotSettings } from '../models/bot-settings.entity';
import { UserAttributionModule } from './user-attribution.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shipment, Withdrawal, ClientAddress, Organization, CompanySettings, User, BotSettings]),
    OrganizationModule,
    LanguageModule,
    BotSettingsModule,
    NotificationModule,
    EmailModule,
    UserAttributionModule,
  ],
  controllers: [ShipmentController, ShipmentPublicController],
  providers: [ShipmentService, ShipmentNotificationService, ShipmentSchedulerService],
  exports: [ShipmentService, ShipmentNotificationService],
})
export class ShipmentModule {}
