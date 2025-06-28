import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../models/category.entity';
import { Product } from '../models/product.entity';
import { CategoryService } from '../services/category.service';
import { CategoryController } from '../controllers/category.controller';
import { FileUploadService } from '../services/file-upload.service';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { LanguageModule } from './language.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product]), LanguageModule],
  controllers: [CategoryController],
  providers: [CategoryService, FileUploadService, CategoryMapper],
  exports: [CategoryService, CategoryMapper],
})
export class CategoryModule {}
