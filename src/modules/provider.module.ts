import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../models/provider.entity';
import { ProviderAddress } from '../models/provider-address.entity';
import { ProviderTaxData } from '../models/provider-tax-data.entity';
import { ProviderCredit } from '../models/provider-credit.entity';
import { ProviderService } from '../services/provider.service';
import { ProviderController } from '../controllers/provider.controller';
import { ProviderMapper } from '../services/mappers/provider.mapper';
import { LanguageModule } from './language.module';
import { SurrogateModule } from './surrogate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      ProviderAddress,
      ProviderTaxData,
      ProviderCredit
    ]),
    LanguageModule,
    SurrogateModule,
  ],
  controllers: [ProviderController],
  providers: [ProviderService, ProviderMapper],
  exports: [ProviderService, ProviderMapper],
})
export class ProviderModule { }
