import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdrawal } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import { WithdrawalService } from '../services/withdrawal.service';
import { WithdrawalController } from '../controllers/withdrawal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdrawal, WithdrawalDetail, Client, Product]),
  ],
  controllers: [WithdrawalController],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {} 