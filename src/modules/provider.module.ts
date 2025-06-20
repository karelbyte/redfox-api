import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../models/provider.entity';
import { ProviderService } from '../services/provider.service';
import { ProviderController } from '../controllers/provider.controller';
import { ProviderMapper } from '../services/mappers/provider.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Provider])],
  controllers: [ProviderController],
  providers: [ProviderService, ProviderMapper],
  exports: [ProviderService],
})
export class ProviderModule {} 