import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from '../models/warehouse.entity';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { Inventory } from '../models/inventory.entity';
import { ProductHistory } from '../models/product-history.entity';
import { WarehouseService } from '../services/warehouse.service';
import { WarehouseController } from '../controllers/warehouse.controller';
import { CurrencyModule } from './currency.module';
import { LanguageModule } from './language.module';
import { WarehouseMapper } from '../services/mappers/warehouse.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      WarehouseOpening,
      Inventory,
      ProductHistory,
    ]),
    CurrencyModule,
    LanguageModule,
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService, WarehouseMapper],
  exports: [WarehouseService],
})
export class WarehouseModule {}
