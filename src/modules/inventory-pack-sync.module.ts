import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '../models/inventory.entity';
import { Product } from '../models/product.entity';
import { InventoryPackSyncService } from '../services/inventory-pack-sync.service';
import { CertificationPackModule } from './certification-pack.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, Product]),
    CertificationPackModule,
  ],
  providers: [InventoryPackSyncService],
  exports: [InventoryPackSyncService],
})
export class InventoryPackSyncModule {}
