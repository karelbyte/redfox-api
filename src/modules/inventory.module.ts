import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '../models/inventory.entity';
import { InventoryService } from '../services/inventory.service';
import { InventoryController } from '../controllers/inventory.controller';
import { ProductModule } from './product.module';
import { WarehouseModule } from './warehouse.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory]),
    ProductModule,
    WarehouseModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
