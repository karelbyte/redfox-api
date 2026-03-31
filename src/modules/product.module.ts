import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../models/product.entity';
import { ProductPrice } from '../models/product-price.entity';
import { ProductTax } from '../models/product-tax.entity';
import { Inventory } from '../models/inventory.entity';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { Tax } from '../models/tax.entity';
import { ProductService } from '../services/product.service';
import { ProductController } from '../controllers/product.controller';
import { MeasurementUnitModule } from './measurement-unit.module';
import { BrandModule } from './brand.module';
import { CategoryModule } from './category.module';
import { TaxModule } from './tax.module';
import { ProductMapper } from '../services/mappers/product.mapper';
import { CurrencyMapper } from '../services/mappers/currency.mapper';
import { LanguageModule } from './language.module';
import { CertificationPackModule } from './certification-pack.module';
import { SurrogateModule } from './surrogate.module';
import { OrganizationModule } from './organization.module';
import { CurrencyModule } from './currency.module';
import { Currency } from '../models/currency.entity';
import { ProductPackImportService } from '../services/product-pack-import.service';
import { ProductPackSyncService } from '../services/product-pack-sync.service';
import { NotificationModule } from './notification.module';
import { User } from '../models/user.entity';
import { UploadsModule } from './uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductPrice,
      ProductTax,
      Inventory,
      WarehouseOpening,
      MeasurementUnit,
      Tax,
      Currency,
      User,
    ]),
    NotificationModule,
    MeasurementUnitModule,
    BrandModule,
    CategoryModule,
    TaxModule,
    LanguageModule,
    CertificationPackModule,
    SurrogateModule,
    OrganizationModule,
    CurrencyModule,
    UploadsModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductMapper, CurrencyMapper, ProductPackImportService, ProductPackSyncService],
  exports: [ProductService, ProductMapper, CurrencyMapper, ProductPackSyncService],
})
export class ProductModule {}
