import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../models/audit-log.entity';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogController } from '../controllers/audit-log.controller';
import { OrganizationModule } from './organization.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), OrganizationModule],
  providers: [AuditLogService],
  controllers: [AuditLogController],
  exports: [AuditLogService],
})
export class AuditLogModule {}
