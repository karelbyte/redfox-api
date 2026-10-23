import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentSeries } from '../models/document-series.entity';
import { DocumentSeriesService } from '../services/document-series.service';
import { DocumentSeriesController } from '../controllers/document-series.controller';
import { LanguageModule } from './language.module';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentSeries]),
    LanguageModule,
    // TenantContext (organización activa del request) lo exporta OrganizationModule.
    OrganizationModule,
  ],
  controllers: [DocumentSeriesController],
  providers: [DocumentSeriesService],
  exports: [DocumentSeriesService],
})
export class DocumentSeriesModule {}
