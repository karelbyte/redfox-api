import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reception } from '../models/reception.entity';
import { ReceptionDetail } from '../models/reception-detail.entity';
import { Provider } from '../models/provider.entity';
import { Product } from '../models/product.entity';
import { Warehouse } from '../models/warehouse.entity';
import { ReceptionService } from '../services/reception.service';
import { ReceptionController } from '../controllers/reception.controller';
import { ProductModule } from './product.module';
import { WarehouseMapper } from '../services/mappers/warehouse.mapper';
import { CurrencyMapper } from '../services/mappers/currency.mapper';
import { ProductMapper } from '../services/mappers/product.mapper';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reception, ReceptionDetail, Provider, Product, Warehouse]),
    ProductModule,
  ],
  controllers: [ReceptionController],
  providers: [
    ReceptionService, 
    WarehouseMapper, 
    CurrencyMapper, 
    ProductMapper,
    BrandMapper,
    CategoryMapper,
    TaxMapper,
    MeasurementUnitMapper,
  ],
  exports: [ReceptionService],
})
export class ReceptionModule {} 