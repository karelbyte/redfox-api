import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../models/invoice.entity';
import { InvoiceDetail } from '../models/invoice-detail.entity';
import { Client } from '../models/client.entity';
import { Withdrawal } from '../models/withdrawal.entity';
import { Product } from '../models/product.entity';
import { Tax } from '../models/tax.entity';
import { InvoiceService } from '../services/invoice.service';
import { InvoiceController } from '../controllers/invoice.controller';
import { CertificationPackModule } from './certification-pack.module';
import { ProductModule } from './product.module';
import { ClientMapper } from '../services/mappers/client.mapper';
import { WithdrawalMapper } from '../services/mappers/withdrawal.mapper';
import { ProductMapper } from '../services/mappers/product.mapper';
import { BrandMapper } from '../services/mappers/brand.mapper';
import { CategoryMapper } from '../services/mappers/category.mapper';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { MeasurementUnitMapper } from '../services/mappers/measurement-unit.mapper';
import { InvoiceMapper } from '../services/mappers/invoice.mapper';
import { InvoiceDetailMapper } from '../services/mappers/invoice-detail.mapper';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceDetail,
      Client,
      Withdrawal,
      Product,
      Tax,
    ]),
    ProductModule,
    LanguageModule,
    CertificationPackModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    ClientMapper,
    WithdrawalMapper,
    ProductMapper,
    BrandMapper,
    CategoryMapper,
    TaxMapper,
    MeasurementUnitMapper,
    InvoiceMapper,
    InvoiceDetailMapper,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
