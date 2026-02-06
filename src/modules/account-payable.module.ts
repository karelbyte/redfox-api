import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountPayable } from '../models/account-payable.entity';
import { AccountPayableService } from '../services/account-payable.service';
import { AccountPayableController } from '../controllers/account-payable.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AccountPayable])],
  providers: [AccountPayableService],
  controllers: [AccountPayableController],
  exports: [AccountPayableService],
})
export class AccountPayableModule {}
