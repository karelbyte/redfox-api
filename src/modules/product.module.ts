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
import { LanguageModule } from './language.module';
import { CertificationPackModule } from './certification-pack.module';
import { SurrogateModule } from './surrogate.module';
import { OrganizationModule } from './organization.module';
import { ProductPackImportService } from '../services/product-pack-import.service';
import { ProductPackSyncService } from '../services/product-pack-sync.service';

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
    ]),
    MeasurementUnitModule,
    BrandModule,
    CategoryModule,
    TaxModule,
    LanguageModule,
    CertificationPackModule,
    SurrogateModule,
    OrganizationModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductMapper, ProductPackImportService, ProductPackSyncService],
  exports: [ProductService, ProductMapper],
})
export class ProductModule {}
