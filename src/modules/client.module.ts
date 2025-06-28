import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientController } from '../controllers/client.controller';
import { ClientService } from '../services/client.service';
import { Client } from '../models/client.entity';
import { ClientMapper } from '../services/mappers/client.mapper';
import { LanguageModule } from './language.module';

@Module({
  imports: [TypeOrmModule.forFeature([Client]), LanguageModule],
  controllers: [ClientController],
  providers: [ClientService, ClientMapper],
  exports: [ClientService],
})
export class ClientModule {}
