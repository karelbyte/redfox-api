import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationPack } from '../models/certification-pack.entity';
import { CertificationPackService } from '../services/certification-pack.service';
import { CertificationPackFactoryService } from '../services/certification-pack-factory.service';
import { CertificationPackController } from '../controllers/certification-pack.controller';
import { FacturaAPIService } from '../services/facturapi.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([CertificationPack]),
    ConfigModule,
  ],
  controllers: [CertificationPackController],
  providers: [
    CertificationPackService,
    CertificationPackFactoryService,
    FacturaAPIService,
  ],
  exports: [
    CertificationPackService,
    CertificationPackFactoryService,
  ],
})
export class CertificationPackModule {}
