import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashTransaction } from '../models/cash-transaction.entity';
import { CashRegister } from '../models/cash-register.entity';
import { CashTransactionController } from '../controllers/cash-transaction.controller';
import { CashTransactionService } from '../services/cash-transaction.service';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashTransaction, CashRegister]),
    LanguageModule,
  ],
  controllers: [CashTransactionController],
  providers: [CashTransactionService],
  exports: [CashTransactionService],
})
export class CashTransactionModule {} 