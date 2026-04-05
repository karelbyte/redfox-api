import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationController } from '../controllers/quotation.controller';
import { QuotationService } from '../services/quotation.service';
import { Quotation } from '../models/quotation.entity';
import { QuotationDetail } from '../models/quotation-detail.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Withdrawal } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { WarehouseMapper } from '../services/mappers/warehouse.mapper';
import { CurrencyMapper } from '../services/mappers/currency.mapper';
import { ProductMapper } from '../services/mappers/product.mapper';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';
import { TranslationService } from '../services/translation.service';
import { UserContextService } from '../services/user-context.service';
import { Language } from '../models/language.entity';
import { User } from '../models/user.entity';
import { OrganizationModule } from './organization.module';
import { SurrogateModule } from './surrogate.module';
import { WithdrawalModule } from './withdrawal.module';
import { InvoiceModule } from './invoice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      QuotationDetail,
      Client,
      Product,
      Warehouse,
      Withdrawal,
      WithdrawalDetail,
      Language,
      User,
    ]),
    OrganizationModule,
    SurrogateModule,
    forwardRef(() => WithdrawalModule),
    forwardRef(() => InvoiceModule),
  ],
  controllers: [QuotationController],
  providers: [
    QuotationService,
    WarehouseMapper,
    CurrencyMapper,
    ProductMapper,
    BrandMapper,
    CategoryMapper,
    TaxMapper,
    MeasurementUnitMapper,
    TranslationService,
    UserContextService,
  ],
  exports: [QuotationService],
})
export class QuotationModule {}
