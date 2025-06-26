import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from '../models/brand.entity';
import { Product } from '../models/product.entity';
import { BrandService } from '../services/brand.service';
import { BrandController } from '../controllers/brand.controller';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { TranslationService } from '../services/translation.service';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand, Product]),
    LanguageModule,
  ],
  controllers: [BrandController],
  providers: [BrandService, BrandMapper],
  exports: [BrandService, BrandMapper],
})
export class BrandModule {} 