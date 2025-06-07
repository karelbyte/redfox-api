import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from '../models/currency.entity';
import { CurrencyService } from '../services/currency.service';
import { CurrencyController } from '../controllers/currency.controller';
import { CurrencyMapper } from '../services/mappers/currency.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Currency])],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrencyMapper],
  exports: [CurrencyService, CurrencyMapper],
})
export class CurrencyModule {} 