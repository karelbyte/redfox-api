import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '../guards/auth.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { PartialOrganizationCleanupDto } from '../dtos/admin/partial-organization-cleanup.dto';

@Controller('admin')
@UseGuards(AuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  // Campos sensibles que deben ser filtrados en las respuestas
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

  /**
   * Sanitiza datos sensibles de forma recursiva
   */
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

      // Verificar si el campo es sensible
      if (
        this.SENSITIVE_FIELDS.some((sensitiveField) =>
          lowerKey.includes(sensitiveField),
        )
      ) {
        sanitized[key] = '[FILTERED]';
      } else if (value && typeof value === 'object') {
        // Recursivamente sanitizar objetos anidados
        sanitized[key] = this.sanitizeResponseData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitiza un log de auditoría completo
   */
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

  @Post('impersonate/:userId')
  impersonate(@Param('userId') userId: string) {
    return this.authService.impersonate(userId);
  }

  @Get('metrics')
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('organizations')
  getOrganizations() {
    return this.adminService.getOrganizations();
  }

  @Put('organizations/:id')
  toggleOrganization(
    @Param('id') id: string,
    @Body() body: { status: boolean },
  ) {
    return this.adminService.toggleOrganization(id, body.status);
  }

  @Delete('organizations/:id')
  deleteOrganization(@Param('id') id: string) {
    return this.adminService.deleteOrganization(id);
  }

  @Post('organizations/:id/partial-cleanup')
  partialCleanupOrganization(
    @Param('id') id: string,
    @Body() body: PartialOrganizationCleanupDto,
  ) {
    return this.adminService.partialCleanupOrganization(id, body.targets);
  }

  @Get('subscriptions')
  getSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSubscriptions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
  }

  @Post('subscriptions')
  createSubscription(
    @Body()
    body: {
      organization_id: string;
      plan_id: string;
      status: string;
      trial_end_date?: string;
      subscription_start_date?: string;
      subscription_end_date?: string;
    },
  ) {
    return this.adminService.createSubscription(body);
  }

  @Delete('subscriptions/:id')
  deleteSubscription(@Param('id') id: string) {
    return this.adminService.deleteSubscription(id);
  }

  @Put('subscriptions/:id')
  updateSubscription(
    @Param('id') id: string,
    @Body()
    body: {
      plan_id?: string;
      trial_end_date?: string;
      status?: string;
      subscription_end_date?: string;
      current_period_end?: string;
    },
  ) {
    return this.adminService.updateSubscription(id, body);
  }

  @Get('users')
  getUsers(@Query('page') page?: string) {
    return this.adminService.getUsers(page ? parseInt(page) : 1);
  }

  @Put('users/:id')
  toggleUser(@Param('id') id: string, @Body() body: { status: boolean }) {
    return this.adminService.toggleUser(id, body.status);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: any,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.adminService.getAuditLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      entityType,
      action,
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      organizationId,
      search,
    );

    return {
      ...result,
      data: result.data.map((log) => this.sanitizeAuditLog(log)),
    };
  }
}
