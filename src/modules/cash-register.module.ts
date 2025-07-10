import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegister } from '../models/cash-register.entity';
import { CashTransaction } from '../models/cash-transaction.entity';
import { CashRegisterController } from '../controllers/cash-register.controller';
import { CashRegisterService } from '../services/cash-register.service';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashRegister, CashTransaction]),
    LanguageModule,
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {} 