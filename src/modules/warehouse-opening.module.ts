import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { WarehouseOpeningService } from '../services/warehouse-opening.service';
import { WarehouseOpeningController } from '../controllers/warehouse-opening.controller';
import { ProductModule } from './product.module';
import { WarehouseModule } from './warehouse.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WarehouseOpening]),
    ProductModule,
    WarehouseModule,
  ],
  controllers: [WarehouseOpeningController],
  providers: [WarehouseOpeningService],
  exports: [WarehouseOpeningService],
})
export class WarehouseOpeningModule {}
