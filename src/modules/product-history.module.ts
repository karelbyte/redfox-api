import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductHistory } from '../models/product-history.entity';
import { ProductHistoryService } from '../services/product-history.service';
import { ProductHistoryController } from '../controllers/product-history.controller';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductHistory]), OrganizationModule],
  controllers: [ProductHistoryController],
  providers: [ProductHistoryService],
  exports: [ProductHistoryService],
})
export class ProductHistoryModule {}
