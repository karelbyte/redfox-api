import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotSettings } from '../models/bot-settings.entity';
import { BotConversation } from '../models/bot-conversation.entity';
import { BotMessage } from '../models/bot-message.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import { CompanySettings } from '../models/company-settings.entity';
import { Quotation } from '../models/quotation.entity';
import { QuotationDetail } from '../models/quotation-detail.entity';
import { BotSettingsController } from '../controllers/bot-settings.controller';
import { BotSettingsService } from '../services/bot-settings.service';
import { BotSettingsMapper } from '../services/mappers/bot-settings.mapper';
import { BaileysProviderService } from '../services/baileys-provider.service';
import { BotConversationService } from '../services/bot-conversation.service';
import { RuleBasedBotIntentInterpreterService } from '../services/rule-based-bot-intent-interpreter.service';
import { BaileysRedisAuthStateService } from '../services/baileys-redis-auth-state.service';
import { OrganizationModule } from './organization.module';
import { QuotationModule } from './quotation.module';
import { SurrogateModule } from './surrogate.module';
import { EmailModule } from './email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BotSettings,
      BotConversation,
      BotMessage,
      Client,
      Product,
      CompanySettings,
      Quotation,
      QuotationDetail,
    ]),
    OrganizationModule,
    QuotationModule,
    SurrogateModule,
    EmailModule,
  ],
  controllers: [BotSettingsController],
  providers: [
    BotSettingsService,
    BotSettingsMapper,
    RuleBasedBotIntentInterpreterService,
    BotConversationService,
    BaileysRedisAuthStateService,
    BaileysProviderService,
  ],
  exports: [BotSettingsService],
})
export class BotSettingsModule {}
