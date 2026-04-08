import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryAlertsService } from '../services/inventory-alerts.service';
import { InventoryAlertsController } from '../controllers/inventory-alerts.controller';
import { Inventory } from '../models/inventory.entity';
import { Product } from '../models/product.entity';
import { User } from '../models/user.entity';
import { NotificationModule } from './notification.module';
import { TenantContext } from '../services/tenant-context.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, Product, User]),
    NotificationModule,
  ],
  controllers: [InventoryAlertsController],
  providers: [InventoryAlertsService, TenantContext],
  exports: [InventoryAlertsService],
})
export class InventoryAlertsModule {}
