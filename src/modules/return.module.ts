import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Return } from '../models/return.entity';
import { ReturnDetail } from '../models/return-detail.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Provider } from '../models/provider.entity';
import { Product } from '../models/product.entity';
import { Inventory } from '../models/inventory.entity';
import { ProductHistory } from '../models/product-history.entity';
import { ReturnService } from '../services/return.service';
import { ReturnController } from '../controllers/return.controller';
import { WarehouseModule } from './warehouse.module';
import { ProviderModule } from './provider.module';
import { ProductModule } from './product.module';
import { CurrencyModule } from './currency.module';
import { BrandModule } from './brand.module';
import { CategoryModule } from './category.module';
import { TaxModule } from './tax.module';
import { MeasurementUnitModule } from './measurement-unit.module';
import { LanguageModule } from './language.module';
import { WarehouseMapper } from '../services/mappers/warehouse.mapper';
import { ProductMapper } from '../services/mappers/product.mapper';
import { ProviderMapper } from '../services/mappers/provider.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Return,
      ReturnDetail,
      Warehouse,
      Provider,
      Product,
      Inventory,
      ProductHistory,
    ]),
    WarehouseModule,
    ProviderModule,
    ProductModule,
    CurrencyModule,
    BrandModule,
    CategoryModule,
    TaxModule,
    MeasurementUnitModule,
    LanguageModule,
  ],
  controllers: [ReturnController],
  providers: [ReturnService, WarehouseMapper, ProductMapper, ProviderMapper],
  exports: [ReturnService],
})
export class ReturnModule {}
