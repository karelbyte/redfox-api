import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../models/product.entity';
import { Inventory } from '../models/inventory.entity';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { ProductService } from '../services/product.service';
import { ProductController } from '../controllers/product.controller';
import { MeasurementUnitModule } from './measurement-unit.module';
import { BrandModule } from './brand.module';
import { CategoryModule } from './category.module';
import { TaxModule } from './tax.module';
import { ProductMapper } from '../services/mappers/product.mapper';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Inventory, WarehouseOpening]),
    MeasurementUnitModule,
    BrandModule,
    CategoryModule,
    TaxModule,
    LanguageModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductMapper],
  exports: [ProductService],
})
export class ProductModule {}
