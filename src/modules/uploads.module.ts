import { Module } from '@nestjs/common';
import { UploadsController } from '../controllers/uploads.controller';
import { StorageModule } from './storage.module';
import { UnifiedUploadService } from '../services/unified-upload.service';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [StorageModule, OrganizationModule],
  controllers: [UploadsController],
  providers: [UnifiedUploadService],
  exports: [UnifiedUploadService],
})
export class UploadsModule {}
