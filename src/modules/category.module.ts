import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../models/category.entity';
import { Product } from '../models/product.entity';
import { CategoryService } from '../services/category.service';
import { CategoryController } from '../controllers/category.controller';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { LanguageModule } from './language.module';
import { OrganizationModule } from './organization.module';
import { UploadsModule } from './uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Product]),
    LanguageModule,
    OrganizationModule,
    UploadsModule,
  ],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryMapper],
  exports: [CategoryService, CategoryMapper],
})
export class CategoryModule {}
