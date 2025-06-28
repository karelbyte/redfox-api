import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdrawal } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Inventory } from '../models/inventory.entity';
import { ProductHistory } from '../models/product-history.entity';
import { WithdrawalService } from '../services/withdrawal.service';
import { WithdrawalController } from '../controllers/withdrawal.controller';
import { ProductModule } from './product.module';
import { ProductMapper } from '../services/mappers/product.mapper';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';
import { WarehouseMapper } from '../services/mappers/warehouse.mapper';
import { CurrencyMapper } from '../services/mappers/currency.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Withdrawal,
      WithdrawalDetail,
      Client,
      Product,
      Warehouse,
      Inventory,
      ProductHistory,
    ]),
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
    WarehouseMapper,
    CurrencyMapper,
  ],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
