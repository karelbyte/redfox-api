import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountReceivableService } from '../services/account-receivable.service';
import { AccountReceivableController } from '../controllers/account-receivable.controller';
import { AccountReceivable } from '../models/account-receivable.entity';
import { AccountReceivablePayment } from '../models/account-receivable-payment.entity';
import { ClientModule } from './client.module';
import { OrganizationModule } from './organization.module';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountReceivable, AccountReceivablePayment]),
    forwardRef(() => ClientModule),
    OrganizationModule,
    LanguageModule,
  ],
  controllers: [AccountReceivableController],
  providers: [AccountReceivableService],
  exports: [AccountReceivableService],
})
export class AccountReceivableModule {}
