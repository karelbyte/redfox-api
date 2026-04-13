import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { Withdrawal } from '../models/withdrawal.entity';
import { Product } from '../models/product.entity';
import { Client } from '../models/client.entity';
import { Invoice } from '../models/invoice.entity';
import { Inventory } from '../models/inventory.entity';
import { Reception } from '../models/reception.entity';
import { AccountReceivable } from '../models/account-receivable.entity';
import { Expense } from '../models/expense.entity';
import { Shipment } from '../models/shipment.entity';
import { TenantContext } from '../services/tenant-context.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Withdrawal,
      Product,
      Client,
      Invoice,
      Inventory,
      Reception,
      AccountReceivable,
      Expense,
      Shipment,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, TenantContext],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
