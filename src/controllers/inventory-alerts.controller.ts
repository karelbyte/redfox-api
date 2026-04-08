import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  InventoryAlertsService,
  InventoryAlertsResponse,
} from '../services/inventory-alerts.service';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { TenantContext } from '../services/tenant-context.service';
import { UserId } from '../decorators/user-id.decorator';

@Controller('inventory-alerts')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class InventoryAlertsController {
  constructor(
    private readonly inventoryAlertsService: InventoryAlertsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get()
  async getInventoryAlerts(
    @Query('urgentDays') urgentDays?: string,
    @Query('warningDays') warningDays?: string,
  ): Promise<InventoryAlertsResponse> {
    const organizationId = this.tenantContext.getOrganizationId() as string;
    return this.inventoryAlertsService.getInventoryAlerts(organizationId);
  }

  @Get('expiring')
  async getExpiringProducts(
    @Query('urgentDays') urgentDays?: string,
    @Query('warningDays') warningDays?: string,
  ) {
    const organizationId = this.tenantContext.getOrganizationId() as string;
    return this.inventoryAlertsService.getExpiringProducts(
      organizationId,
      urgentDays ? parseInt(urgentDays) : 3,
      warningDays ? parseInt(warningDays) : 15,
    );
  }

  @Get('low-stock')
  async getLowStockProducts() {
    const organizationId = this.tenantContext.getOrganizationId() as string;
    return this.inventoryAlertsService.getLowStockProducts(organizationId);
  }

  @Post('generate')
  async generateImmediateAlerts(@UserId() userId: string) {
    const organizationId = this.tenantContext.getOrganizationId() as string;
    await this.inventoryAlertsService.checkAndGenerateImmediateAlerts(
      organizationId,
    );
    return {
      message: 'Alertas generadas exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('generate/:productId')
  async generateProductAlerts(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const organizationId = this.tenantContext.getOrganizationId() as string;
    await this.inventoryAlertsService.checkAndGenerateImmediateAlerts(
      organizationId,
      productId,
    );
    return {
      message: 'Alertas del producto generadas exitosamente',
      productId,
      timestamp: new Date().toISOString(),
    };
  }
}
