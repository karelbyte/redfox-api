import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from '../models/warehouse.entity';
import { WarehouseService } from '../services/warehouse.service';
import { WarehouseController } from '../controllers/warehouse.controller';
import { CurrencyModule } from './currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse]),
    CurrencyModule,
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {} 