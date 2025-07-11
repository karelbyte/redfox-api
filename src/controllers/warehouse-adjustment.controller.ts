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
import { WarehouseAdjustmentService } from '../services/warehouse-adjustment.service';
import { CreateWarehouseAdjustmentDto } from '../dtos/warehouse-adjustment/create-warehouse-adjustment.dto';
import { CreateWarehouseAdjustmentDetailDto } from '../dtos/warehouse-adjustment/create-warehouse-adjustment-detail.dto';
import { UpdateWarehouseAdjustmentDetailDto } from '../dtos/warehouse-adjustment/update-warehouse-adjustment-detail.dto';
import { WarehouseAdjustmentResponseDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-response.dto';
import { WarehouseAdjustmentDetailResponseDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-detail-response.dto';
import { WarehouseAdjustmentQueryDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-query.dto';
import { WarehouseAdjustmentDetailQueryDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('warehouse-adjustments')
@UseGuards(AuthGuard)
export class WarehouseAdjustmentController {
  constructor(
    private readonly warehouseAdjustmentService: WarehouseAdjustmentService,
  ) {}

  @Post()
  create(
    @Body() createWarehouseAdjustmentDto: CreateWarehouseAdjustmentDto,
    @UserId() userId: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    return this.warehouseAdjustmentService.create(
      createWarehouseAdjustmentDto,
      userId,
    );
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query() queryDto: WarehouseAdjustmentQueryDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<WarehouseAdjustmentResponseDto>> {
    return this.warehouseAdjustmentService.findAll(
      paginationDto,
      queryDto,
      userId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    return this.warehouseAdjustmentService.findOne(id, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.warehouseAdjustmentService.remove(id, userId);
  }

  @Post(':id/process')
  processAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    return this.warehouseAdjustmentService.processAdjustment(id, userId);
  }

  // Rutas para detalles de ajuste
  @Post(':id/details')
  createDetail(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Body() createDetailDto: CreateWarehouseAdjustmentDetailDto,
    @UserId() userId: string,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    return this.warehouseAdjustmentService.createDetail(
      adjustmentId,
      createDetailDto,
      userId,
    );
  }

  @Get(':id/details')
  findAllDetails(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Query() queryDto: WarehouseAdjustmentDetailQueryDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<WarehouseAdjustmentDetailResponseDto>> {
    return this.warehouseAdjustmentService.findAllDetails(
      adjustmentId,
      queryDto,
      userId,
    );
  }

  @Get(':id/details/:detailId')
  findOneDetail(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    return this.warehouseAdjustmentService.findOneDetail(
      adjustmentId,
      detailId,
      userId,
    );
  }

  @Put(':id/details/:detailId')
  updateDetail(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @Body() updateDetailDto: UpdateWarehouseAdjustmentDetailDto,
    @UserId() userId: string,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    return this.warehouseAdjustmentService.updateDetail(
      adjustmentId,
      detailId,
      updateDetailDto,
      userId,
    );
  }

  @Delete(':id/details/:detailId')
  removeDetail(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.warehouseAdjustmentService.removeDetail(
      adjustmentId,
      detailId,
      userId,
    );
  }
}
