import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction } from '../models/audit-log.entity';

@Controller('audit-logs')
@UseGuards(AuthGuard)
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Get('entity/:entityType/:entityId')
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId, limit);
  }

  @Get('user')
  async findByUser(
    @Query('userId') userId: string,
    @Query('limit') limit: number = 100,
  ) {
    return this.auditLogService.findByUser(userId, limit);
  }

  @Get('action/:action')
  async findByAction(
    @Param('action') action: AuditAction,
    @Query('limit') limit: number = 100,
  ) {
    return this.auditLogService.findByAction(action, limit);
  }

  @Get('stats/:entityType')
  async getStats(@Param('entityType') entityType: string) {
    return this.auditLogService.getStats(entityType);
  }
}
