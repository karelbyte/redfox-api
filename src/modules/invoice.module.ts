import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../models/invoice.entity';
import { InvoiceDetail } from '../models/invoice-detail.entity';
import { InvoicePayment } from '../models/invoice-payment.entity';
import { Client } from '../models/client.entity';
import { Withdrawal } from '../models/withdrawal.entity';
import { Product } from '../models/product.entity';
import { Tax } from '../models/tax.entity';
import { AccountReceivable } from '../models/account-receivable.entity';
import { InvoiceService } from '../services/invoice.service';
import { InvoicePaymentService } from '../services/invoice-payment.service';
import { InvoiceController } from '../controllers/invoice.controller';
import { InvoicePaymentController } from '../controllers/invoice-payment.controller';
import { CertificationPackModule } from './certification-pack.module';
import { ProductModule } from './product.module';
import { AccountReceivableModule } from './account-receivable.module';
import { ClientMapper } from '../services/mappers/client.mapper';
import { WithdrawalMapper } from '../services/mappers/withdrawal.mapper';
import { ProductMapper } from '../services/mappers/product.mapper';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';
import { CurrencyMapper } from '../services/mappers/currency.mapper';
import { InvoiceMapper } from '../services/mappers/invoice.mapper';
import { InvoiceDetailMapper } from '../services/mappers/invoice-detail.mapper';
import { LanguageModule } from './language.module';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceDetail,
      InvoicePayment,
      AccountReceivable,
      Client,
      Withdrawal,
      Product,
      Tax,
    ]),
    ProductModule,
    LanguageModule,
    CertificationPackModule,
    OrganizationModule,
    forwardRef(() => AccountReceivableModule),
  ],
  controllers: [InvoiceController, InvoicePaymentController],
  providers: [
    InvoiceService,
    InvoicePaymentService,
    ClientMapper,
    WithdrawalMapper,
    ProductMapper,
    BrandMapper,
    CategoryMapper,
    TaxMapper,
    MeasurementUnitMapper,
    CurrencyMapper,
    InvoiceMapper,
    InvoiceDetailMapper,
  ],
  exports: [InvoiceService, InvoicePaymentService],
})
export class InvoiceModule {}
