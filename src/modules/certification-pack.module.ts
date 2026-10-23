import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationPack } from '../models/certification-pack.entity';
import { CertificationPackEmitter } from '../models/certification-pack-emitter.entity';
import { Product } from '../models/product.entity';
import { CertificationPackService } from '../services/certification-pack.service';
import { CertificationPackFactoryService } from '../services/certification-pack-factory.service';
import { CertificationPackController } from '../controllers/certification-pack.controller';
import { FacturaAPIService } from '../services/facturapi.service';
import { FacturaGreenService } from '../services/factura-green.service';
import { SatCatalogService } from '../services/sat-catalog.service';
import { ConfigModule } from '@nestjs/config';
import { OrganizationModule } from './organization.module';
import { LanguageModule } from './language.module';
import { RedisServiceModule } from './redis-service.module';
import { DocumentSeriesModule } from './document-series.module';
import { FacturaApisunatService } from '../services/factura-api-sunat.service';
import { httpRequest, productRepository, sunatApiService } from '../constants/custom-providers';
import { Organization } from '../models/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CertificationPack,
      CertificationPackEmitter,
      Product,
      Organization,
    ]),
    ConfigModule,
    OrganizationModule,
    LanguageModule,
    RedisServiceModule,
    DocumentSeriesModule,
  ],
  controllers: [CertificationPackController],
  providers: [
    CertificationPackService,
    CertificationPackFactoryService,
    FacturaAPIService,
    FacturaGreenService,
    FacturaApisunatService,
    SatCatalogService,
    httpRequest,
    productRepository,
    sunatApiService
  ],
  exports: [
    CertificationPackService,
    CertificationPackFactoryService,
    SatCatalogService,
  ],
})
export class CertificationPackModule {}
