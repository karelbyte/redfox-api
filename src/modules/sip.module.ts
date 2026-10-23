import { Module } from '@nestjs/common';
import { SipController } from '../controllers/sip.controller';
import { UnifiedUploadService } from '../services/unified-upload.service';
import { UploadsModule } from './uploads.module';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [UploadsModule],
  controllers: [SipController],
  providers: [
    UnifiedUploadService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
  exports: [UnifiedUploadService],
})
export class SipModule {}
