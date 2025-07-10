import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tax } from '../models/tax.entity';
import { Product } from '../models/product.entity';
import { TaxService } from '../services/tax.service';
import { TaxController } from '../controllers/tax.controller';
import { TaxMapper } from '../services/mappers/tax.mapper';
import { LanguageModule } from './language.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tax, Product]), LanguageModule],
  controllers: [TaxController],
  providers: [TaxService, TaxMapper],
  exports: [TaxService, TaxMapper],
})
export class TaxModule {}
