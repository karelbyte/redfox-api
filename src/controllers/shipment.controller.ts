import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ShipmentService } from '../services/shipment.service';
import { CreateShipmentDto } from '../dtos/shipment/create-shipment.dto';
import { UpdateShipmentDto } from '../dtos/shipment/update-shipment.dto';
import { ShipmentQueryDto } from '../dtos/shipment/shipment-query.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller()
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Get('shipments/analytics')
  getAnalytics() {
    return this.shipmentService.getAnalytics();
  }

  @Get('shipments')
  findAllGlobal(@Query() queryDto: ShipmentQueryDto, @UserId() userId: string) {
    return this.shipmentService.findAllGlobal(queryDto, userId);
  }

  @Post('withdrawals/:withdrawalId/shipments')
  create(
    @Param('withdrawalId') withdrawalId: string,
    @Body() createShipmentDto: CreateShipmentDto,
    @UserId() userId: string,
  ) {
    createShipmentDto.withdrawal_id = withdrawalId;
    return this.shipmentService.create(createShipmentDto, userId);
  }

  @Get('withdrawals/:withdrawalId/shipments')
  findAllByWithdrawal(
    @Param('withdrawalId') withdrawalId: string,
    @UserId() userId: string,
  ) {
    return this.shipmentService.findAllByWithdrawal(withdrawalId, userId);
  }

  @Get('shipments/:id')
  findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.shipmentService.findOne(id, userId);
  }

  @Put('shipments/:id')
  update(
    @Param('id') id: string,
    @Body() updateShipmentDto: UpdateShipmentDto,
    @UserId() userId: string,
  ) {
    return this.shipmentService.update(id, updateShipmentDto, userId);
  }

  @Delete('shipments/:id')
  remove(@Param('id') id: string, @UserId() userId: string) {
    return this.shipmentService.remove(id, userId);
  }
}
