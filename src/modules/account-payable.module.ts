import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountPayable } from '../models/account-payable.entity';
import { AccountPayablePayment } from '../models/account-payable-payment.entity';
import { AccountPayableService } from '../services/account-payable.service';
import { AccountPayableController } from '../controllers/account-payable.controller';
import { ProviderModule } from './provider.module';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountPayable, AccountPayablePayment]),
    forwardRef(() => ProviderModule),
    OrganizationModule,
  ],
  providers: [AccountPayableService],
  controllers: [AccountPayableController],
  exports: [AccountPayableService],
})
export class AccountPayableModule {}
