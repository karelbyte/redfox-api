import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseAdjustment } from '../models/warehouse-adjustment.entity';
import { WarehouseAdjustmentDetail } from '../models/warehouse-adjustment-detail.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Product } from '../models/product.entity';
import { Inventory } from '../models/inventory.entity';
import { ProductHistory } from '../models/product-history.entity';
import { WarehouseAdjustmentService } from '../services/warehouse-adjustment.service';
import { WarehouseAdjustmentController } from '../controllers/warehouse-adjustment.controller';
import { WarehouseModule } from './warehouse.module';
import { ProductModule } from './product.module';
import { CurrencyModule } from './currency.module';
import { BrandModule } from './brand.module';
import { CategoryModule } from './category.module';
import { TaxModule } from './tax.module';
import { MeasurementUnitModule } from './measurement-unit.module';
import { LanguageModule } from './language.module';
import { WarehouseMapper } from '../services/mappers/warehouse.mapper';
import { ProductMapper } from '../services/mappers/product.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseAdjustment,
      WarehouseAdjustmentDetail,
      Warehouse,
      Product,
      Inventory,
      ProductHistory,
    ]),
    WarehouseModule,
    ProductModule,
    CurrencyModule,
    BrandModule,
    CategoryModule,
    TaxModule,
    MeasurementUnitModule,
    LanguageModule,
  ],
  controllers: [WarehouseAdjustmentController],
  providers: [WarehouseAdjustmentService, WarehouseMapper, ProductMapper],
  exports: [WarehouseAdjustmentService],
})
export class WarehouseAdjustmentModule {} 