import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailConfig } from '../models/email-config.entity';
import { Language } from '../models/language.entity';
import { EmailService } from '../services/email.service';
import { EmailConfigController } from '../controllers/email-config.controller';
import { OrganizationModule } from './organization.module';
import { LanguageModule } from './language.module';
import { TranslationService } from '../services/translation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailConfig, Language]),
    OrganizationModule,
    LanguageModule,
  ],
  controllers: [EmailConfigController],
  providers: [EmailService, TranslationService],
  exports: [EmailService],
})
export class EmailConfigModule {}
