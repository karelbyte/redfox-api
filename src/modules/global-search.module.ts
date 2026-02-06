import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalSearchService } from '../services/global-search.service';
import { GlobalSearchController } from '../controllers/global-search.controller';
import { Product } from '../models/product.entity';
import { Client } from '../models/client.entity';
import { Provider } from '../models/provider.entity';
import { Invoice } from '../models/invoice.entity';
import { PurchaseOrder } from '../models/purchase-order.entity';
import { Expense } from '../models/expense.entity';
import { AccountReceivable } from '../models/account-receivable.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Client,
      Provider,
      Invoice,
      PurchaseOrder,
      Expense,
      AccountReceivable,
    ]),
  ],
  controllers: [GlobalSearchController],
  providers: [GlobalSearchService],
  exports: [GlobalSearchService],
})
export class GlobalSearchModule {}