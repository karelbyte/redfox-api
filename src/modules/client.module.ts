import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientController } from '../controllers/client.controller';
import { ClientService } from '../services/client.service';
import { Client } from '../models/client.entity';
import { ClientMapper } from '../services/mappers/client.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [ClientController],
  providers: [ClientService, ClientMapper],
  exports: [ClientService],
})
export class ClientModule {} 