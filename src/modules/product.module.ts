import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../models/product.entity';
import { ProductService } from '../services/product.service';
import { ProductController } from '../controllers/product.controller';
import { MeasurementUnitModule } from './measurement-unit.module';
import { BrandModule } from './brand.module';
import { CategoryModule } from './category.module';
import { TaxModule } from './tax.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    MeasurementUnitModule,
    BrandModule,
    CategoryModule,
    TaxModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {} 