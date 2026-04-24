import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from '../services/email.service';
import { EmailConfig } from '../models/email-config.entity';
import { Language } from '../models/language.entity';
import { OrganizationModule } from './organization.module';
import { LanguageModule } from './language.module';
import { TranslationService } from '../services/translation.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailConfig, Language]), OrganizationModule, LanguageModule],
  providers: [EmailService, TranslationService],
  exports: [EmailService],
})
export class EmailModule {}
