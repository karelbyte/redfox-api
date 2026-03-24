import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from '../services/storage/storage.interface';
import { LocalStorageService } from '../services/storage/local-storage.service';
import { S3StorageService } from '../services/storage/s3-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const driver = configService.get<string>('STORAGE_DRIVER') || 'local';
        if (driver === 's3') {
          return new S3StorageService(configService);
        }
        return new LocalStorageService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
