import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from '../models/client.entity';
import { ClientAddress } from '../models/client-address.entity';
import { ClientTaxData } from '../models/client-tax-data.entity';
import { Notification } from '../models/notification.entity';
import { User } from '../models/user.entity';
import { Product } from '../models/product.entity';
import { Brand } from '../models/brand.entity';
import { Category } from '../models/category.entity';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { Tax } from '../models/tax.entity';
import { Provider } from '../models/provider.entity';
import { ProviderAddress } from '../models/provider-address.entity';
import { ProviderTaxData } from '../models/provider-tax-data.entity';
import { ImportLog } from '../models/import-log.entity';
import { ClientImportService } from '../services/client-import.service';
import { ProductImportService } from '../services/product-import.service';
import { ProviderImportService } from '../services/provider-import.service';
import { ImportLogService } from '../services/import-log.service';
import { ClientImportController } from '../controllers/client-import.controller';
import { ProductImportController } from '../controllers/product-import.controller';
import { ProviderImportController } from '../controllers/provider-import.controller';
import { ImportQueue } from '../queues/import.queue';
import { InMemoryImportQueue } from '../queues/in-memory-import.queue';
import { ImportProcessor } from '../processors/import.processor';
import { ClientPackSyncService } from '../services/client-pack-sync.service';
import { CertificationPackModule } from './certification-pack.module';
import { TenantContext } from '../services/tenant-context.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientAddress,
      ClientTaxData,
      Notification,
      User,
      Product,
      Brand,
      Category,
      MeasurementUnit,
      Tax,
      Provider,
      ProviderAddress,
      ProviderTaxData,
      ImportLog,
    ]),
    CertificationPackModule,
    BullModule.registerQueueAsync({
      name: 'import',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          db: configService.get<number>('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    ClientImportController,
    ProductImportController,
    ProviderImportController,
  ],
  providers: [
    ClientImportService,
    ProductImportService,
    ProviderImportService,
    ImportLogService,
    ClientPackSyncService,
    ImportQueue,
    InMemoryImportQueue,
    ImportProcessor,
    TenantContext,
  ],
  exports: [
    ImportQueue,
    ClientImportService,
    ProductImportService,
    ProviderImportService,
  ],
})
export class ImportModule {}
