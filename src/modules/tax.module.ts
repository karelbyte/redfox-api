import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tax } from '../models/tax.entity';
import { TaxService } from '../services/tax.service';
import { TaxController } from '../controllers/tax.controller';
import { TaxMapper } from '../services/mappers/tax.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Tax])],
  controllers: [TaxController],
  providers: [TaxService, TaxMapper],
  exports: [TaxService, TaxMapper],
})
export class TaxModule {} 