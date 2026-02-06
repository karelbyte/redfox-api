import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountReceivableService } from '../services/account-receivable.service';
import { AccountReceivableController } from '../controllers/account-receivable.controller';
import { AccountReceivable } from '../models/account-receivable.entity';
import { AccountReceivablePayment } from '../models/account-receivable-payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountReceivable, AccountReceivablePayment])],
  controllers: [AccountReceivableController],
  providers: [AccountReceivableService],
  exports: [AccountReceivableService],
})
export class AccountReceivableModule {}