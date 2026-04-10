import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../models/provider.entity';
import { ProviderAddress } from '../models/provider-address.entity';
import { ProviderTaxData } from '../models/provider-tax-data.entity';
import { ProviderCredit } from '../models/provider-credit.entity';
import { PurchaseOrder } from '../models/purchase-order.entity';
import { Reception } from '../models/reception.entity';
import { Expense } from '../models/expense.entity';
import { AccountPayable } from '../models/account-payable.entity';
import { Return } from '../models/return.entity';
import { ProviderService } from '../services/provider.service';
import { ProviderController } from '../controllers/provider.controller';
import { ProviderMapper } from '../services/mappers/provider.mapper';
import { LanguageModule } from './language.module';
import { SurrogateModule } from './surrogate.module';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      ProviderAddress,
      ProviderTaxData,
      ProviderCredit,
      PurchaseOrder,
      Reception,
      Expense,
      AccountPayable,
      Return,
    ]),
    LanguageModule,
    SurrogateModule,
    OrganizationModule,
  ],
  controllers: [ProviderController],
  providers: [ProviderService, ProviderMapper],
  exports: [ProviderService, ProviderMapper],
})
export class ProviderModule {}
