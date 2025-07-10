import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../models/provider.entity';
import { ProviderService } from '../services/provider.service';
import { ProviderController } from '../controllers/provider.controller';
import { ProviderMapper } from '../services/mappers/provider.mapper';
import { LanguageModule } from './language.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider]),
    LanguageModule,
  ],
  controllers: [ProviderController],
  providers: [ProviderService, ProviderMapper],
  exports: [ProviderService],
})
export class ProviderModule {}
