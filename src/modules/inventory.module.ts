import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '../models/inventory.entity';
import { InventoryService } from '../services/inventory.service';
import { InventoryController } from '../controllers/inventory.controller';
import { ProductModule } from './product.module';
import { WarehouseModule } from './warehouse.module';
import { ProductMapper } from '../services/mappers/product.mapper';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';
import { WarehouseMapper } from '../services/mappers/warehouse.mapper';
import { CurrencyMapper } from '../services/mappers/currency.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory]),
    ProductModule,
    WarehouseModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    ProductMapper,
    BrandMapper,
    CategoryMapper,
    TaxMapper,
    MeasurementUnitMapper,
    WarehouseMapper,
    CurrencyMapper,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
