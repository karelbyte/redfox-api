import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../models/product.entity';
import { ProductService } from '../services/product.service';
import { ProductController } from '../controllers/product.controller';
import { BrandModule } from './brand.module';
import { ProviderModule } from './provider.module';
import { MeasurementUnitModule } from './measurement-unit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    BrandModule,
    ProviderModule,
    MeasurementUnitModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {} 