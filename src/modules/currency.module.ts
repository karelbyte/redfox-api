import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from '../models/currency.entity';
import { CurrencyService } from '../services/currency.service';
import { CurrencyController } from '../controllers/currency.controller';
import { CurrencyMapper } from '../services/mappers/currency.mapper';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Currency]),
    LanguageModule,
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrencyMapper],
  exports: [CurrencyService, CurrencyMapper],
})
export class CurrencyModule {}
