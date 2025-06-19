import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from '../models/brand.entity';
import { Product } from '../models/product.entity';
import { BrandService } from '../services/brand.service';
import { BrandController } from '../controllers/brand.controller';
import { BrandMapper } from '../services/mappers/brand.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Brand, Product])],
  controllers: [BrandController],
  providers: [BrandService, BrandMapper],
  exports: [BrandService, BrandMapper],
})
export class BrandModule {} 