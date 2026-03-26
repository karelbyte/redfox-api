import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashFlowService } from '../services/cash-flow.service';
import { CashFlowController } from '../controllers/cash-flow.controller';
import { Expense } from '../models/expense.entity';
import { AccountReceivable } from '../models/account-receivable.entity';
import { AccountPayable } from '../models/account-payable.entity';
import { Invoice } from '../models/invoice.entity';
import { TenantContext } from '../services/tenant-context.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      AccountReceivable,
      AccountPayable,
      Invoice,
    ]),
  ],
  providers: [CashFlowService, TenantContext],
  controllers: [CashFlowController],
  exports: [CashFlowService],
})
export class CashFlowModule {}
