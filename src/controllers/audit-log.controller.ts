import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction } from '../models/audit-log.entity';

@Controller('audit-logs')
@UseGuards(AuthGuard)
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  private readonly SENSITIVE_FIELDS = [
    'password',
    'token',
    'secret',
    'key',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'privateKey',
    'private_key',
    'publicKey',
    'public_key',
    'salt',
    'hash',
    'signature',
    'authorization',
    'auth',
    'credentials',
    'ssn',
    'social_security_number',
    'credit_card',
    'creditCard',
    'cvv',
    'pin',
    'otp',
  ];

  private sanitizeResponseData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeResponseData(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      if (
        this.SENSITIVE_FIELDS.some((sensitiveField) =>
          lowerKey.includes(sensitiveField),
        )
      ) {
        sanitized[key] = '[FILTERED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeResponseData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeAuditLog(log: any): any {
    return {
      ...log,
      oldValues: log.oldValues
        ? this.sanitizeResponseData(log.oldValues)
        : null,
      newValues: log.newValues
        ? this.sanitizeResponseData(log.newValues)
        : null,
    };
  }

  @Get('entity/:entityType/:entityId')
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit: number = 50,
  ) {
    const logs = await this.auditLogService.findByEntity(
      entityType,
      entityId,
      limit,
    );
    return logs.map((log) => this.sanitizeAuditLog(log));
  }

  @Get('user')
  async findByUser(
    @Query('userId') userId: string,
    @Query('limit') limit: number = 100,
  ) {
    const logs = await this.auditLogService.findByUser(userId, limit);
    return logs.map((log) => this.sanitizeAuditLog(log));
  }

  @Get('action/:action')
  async findByAction(
    @Param('action') action: AuditAction,
    @Query('limit') limit: number = 100,
  ) {
    const logs = await this.auditLogService.findByAction(action, limit);
    return logs.map((log) => this.sanitizeAuditLog(log));
  }

  @Get('stats/:entityType')
  async getStats(@Param('entityType') entityType: string) {
    return this.auditLogService.getStats(entityType);
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('entityType') entityType?: string,
    @Query('action') action?: AuditAction,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.auditLogService.findAll(
      page,
      limit,
      entityType,
      action,
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      ...result,
      data: result.data.map((log) => this.sanitizeAuditLog(log)),
    };
  }
}
