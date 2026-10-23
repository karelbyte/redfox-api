import { Module } from '@nestjs/common';
import { SipController } from '../controllers/sip.controller';
import { UploadsModule } from './uploads.module';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [UploadsModule, OrganizationModule],
  controllers: [SipController],
})
export class SipModule {}
