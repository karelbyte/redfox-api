import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySettings } from '../models/company-settings.entity';
import { CompanySettingsService } from '../services/company-settings.service';
import { CompanySettingsController } from '../controllers/company-settings.controller';
import { CompanySettingsMapper } from '../services/mappers/company-settings.mapper';
import { OrganizationModule } from './organization.module';
import { StorageModule } from './storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanySettings]),
    OrganizationModule,
    StorageModule,
  ],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService, CompanySettingsMapper],
  exports: [CompanySettingsService, CompanySettingsMapper],
})
export class CompanySettingsModule {}
