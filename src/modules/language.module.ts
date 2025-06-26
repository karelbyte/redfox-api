import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLanguageController } from '../controllers/language.controller';
import { LanguageService } from '../services/language.service';
import { Language } from '../models/language.entity';
import { TranslationService } from '../services/translation.service';
import { UserContextService } from '../services/user-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([Language])],
  controllers: [UserLanguageController],
  providers: [LanguageService, TranslationService, UserContextService],
  exports: [LanguageService, TranslationService, UserContextService],
})
export class LanguageModule {}
