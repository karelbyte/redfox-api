import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../models/provider.entity';
import { ProviderService } from '../services/provider.service';
import { ProviderController } from '../controllers/provider.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Provider])],
  controllers: [ProviderController],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {} 