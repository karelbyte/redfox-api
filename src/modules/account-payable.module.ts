import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountPayable } from '../models/account-payable.entity';
import { AccountPayablePayment } from '../models/account-payable-payment.entity';
import { Language } from '../models/language.entity';
import { AccountPayableService } from '../services/account-payable.service';
import { AccountPayableController } from '../controllers/account-payable.controller';
import { ProviderModule } from './provider.module';
import { OrganizationModule } from './organization.module';
import { LanguageModule } from './language.module';
import { TranslationService } from '../services/translation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountPayable, AccountPayablePayment, Language]),
    forwardRef(() => ProviderModule),
    OrganizationModule,
    LanguageModule,
  ],
  providers: [AccountPayableService, TranslationService],
  controllers: [AccountPayableController],
  exports: [AccountPayableService],
})
export class AccountPayableModule {}
