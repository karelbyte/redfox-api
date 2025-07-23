import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Put,
} from '@nestjs/common';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { CreatePurchaseOrderDto } from '../dtos/purchase-order/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dtos/purchase-order/update-purchase-order.dto';
import { PurchaseOrderResponseDto } from '../dtos/purchase-order/purchase-order-response.dto';
import { ApprovePurchaseOrderResponseDto } from '../dtos/purchase-order/approve-purchase-order-response.dto';
import { CreatePurchaseOrderDetailDto } from '../dtos/purchase-order-detail/create-purchase-order-detail.dto';
import { UpdatePurchaseOrderDetailDto } from '../dtos/purchase-order-detail/update-purchase-order-detail.dto';
import { PurchaseOrderDetailResponseDto } from '../dtos/purchase-order-detail/purchase-order-detail-response.dto';
import { PurchaseOrderDetailQueryDto } from '../dtos/purchase-order-detail/purchase-order-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('purchase-orders')
@UseGuards(AuthGuard)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Post()
  create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @UserId() userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.create(createPurchaseOrderDto, userId);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<PurchaseOrderResponseDto>> {
    return this.purchaseOrderService.findAll(paginationDto, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    @UserId() userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.update(id, updatePurchaseOrderDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.purchaseOrderService.remove(id, userId);
  }

  @Post(':id/approve')
  approvePurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<ApprovePurchaseOrderResponseDto> {
    return this.purchaseOrderService.approvePurchaseOrder(id, userId);
  }

  @Post(':id/reject')
  rejectPurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<ApprovePurchaseOrderResponseDto> {
    return this.purchaseOrderService.rejectPurchaseOrder(id, userId);
  }

  @Post(':id/cancel')
  cancelPurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<ApprovePurchaseOrderResponseDto> {
    return this.purchaseOrderService.cancelPurchaseOrder(id, userId);
  }

  // Rutas para detalles de orden de compra
  @Post(':id/details')
  createDetail(
    @Param('id', ParseUUIDPipe) purchaseOrderId: string,
    @Body() createDetailDto: CreatePurchaseOrderDetailDto,
    @UserId() userId: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrderService.createDetail(
      purchaseOrderId,
      createDetailDto,
      userId,
    );
  }

  @Get(':id/details')
  findAllDetails(
    @Param('id', ParseUUIDPipe) purchaseOrderId: string,
    @Query() queryDto: PurchaseOrderDetailQueryDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<PurchaseOrderDetailResponseDto>> {
    return this.purchaseOrderService.findAllDetails(
      purchaseOrderId,
      queryDto,
      userId,
    );
  }

  @Get(':id/details/:detailId')
  findOneDetail(
    @Param('id', ParseUUIDPipe) purchaseOrderId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrderService.findOneDetail(
      purchaseOrderId,
      detailId,
      userId,
    );
  }

  @Put(':id/details/:detailId')
  updateDetail(
    @Param('id', ParseUUIDPipe) purchaseOrderId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @Body() updateDetailDto: UpdatePurchaseOrderDetailDto,
    @UserId() userId: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrderService.updateDetail(
      purchaseOrderId,
      detailId,
      updateDetailDto,
      userId,
    );
  }

  @Delete(':id/details/:detailId')
  removeDetail(
    @Param('id', ParseUUIDPipe) purchaseOrderId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.purchaseOrderService.removeDetail(
      purchaseOrderId,
      detailId,
      userId,
    );
  }
}
