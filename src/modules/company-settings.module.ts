import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySettings } from '../models/company-settings.entity';
import { CompanySettingsService } from '../services/company-settings.service';
import { CompanySettingsController } from '../controllers/company-settings.controller';
import { CompanySettingsMapper } from '../services/mappers/company-settings.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanySettings]),
    ConfigModule,
  ],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService, CompanySettingsMapper],
  exports: [CompanySettingsService, CompanySettingsMapper],
})
export class CompanySettingsModule {}
