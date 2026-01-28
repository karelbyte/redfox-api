import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientController } from '../controllers/client.controller';
import { ClientService } from '../services/client.service';
import { Client } from '../models/client.entity';
import { Invoice } from '../models/invoice.entity';
import { Withdrawal } from '../models/withdrawal.entity';
import { ClientMapper } from '../services/mappers/client.mapper';
import { LanguageModule } from './language.module';
import { CertificationPackModule } from './certification-pack.module';
import { ClientPackSyncService } from '../services/client-pack-sync.service';
import { ClientPackImportService } from '../services/client-pack-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Invoice, Withdrawal]),
    LanguageModule,
    CertificationPackModule,
  ],
  controllers: [ClientController],
  providers: [ClientService, ClientMapper, ClientPackSyncService, ClientPackImportService],
  exports: [ClientService],
})
export class ClientModule {}
