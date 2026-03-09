import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientController } from '../controllers/client.controller';
import { ClientService } from '../services/client.service';
import { Client } from '../models/client.entity';
import { Invoice } from '../models/invoice.entity';
import { Withdrawal } from '../models/withdrawal.entity';
import { ClientAddress } from '../models/client-address.entity';
import { ClientTaxData } from '../models/client-tax-data.entity';
import { ClientCredit } from '../models/client-credit.entity';
import { ClientMapper } from '../services/mappers/client.mapper';
import { LanguageModule } from './language.module';
import { CertificationPackModule } from './certification-pack.module';
import { ClientPackSyncService } from '../services/client-pack-sync.service';
import { ClientPackImportService } from '../services/client-pack-import.service';
import { SurrogateModule } from './surrogate.module';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      Invoice,
      Withdrawal,
      ClientAddress,
      ClientTaxData,
      ClientCredit,
    ]),
    LanguageModule,
    CertificationPackModule,
    SurrogateModule,
    OrganizationModule,
  ],
  controllers: [ClientController],
  providers: [
    ClientService,
    ClientMapper,
    ClientPackSyncService,
    ClientPackImportService,
  ],
  exports: [ClientService],
})
export class ClientModule {}
