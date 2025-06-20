import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdrawal } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import { WithdrawalService } from '../services/withdrawal.service';
import { WithdrawalController } from '../controllers/withdrawal.controller';
import { ProductModule } from './product.module';
import { ProductMapper } from '../services/mappers/product.mapper';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdrawal, WithdrawalDetail, Client, Product]),
    ProductModule,
  ],
  controllers: [WithdrawalController],
  providers: [
    WithdrawalService, 
    ProductMapper,
    BrandMapper,
    CategoryMapper,
    TaxMapper,
    MeasurementUnitMapper,
  ],
  exports: [WithdrawalService],
})
export class WithdrawalModule {} 