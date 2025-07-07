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

@Controller('warehouse-adjustments')
@UseGuards(AuthGuard)
export class WarehouseAdjustmentController {
  constructor(
    private readonly warehouseAdjustmentService: WarehouseAdjustmentService,
  ) {}

  @Post()
  create(
    @Body() createWarehouseAdjustmentDto: CreateWarehouseAdjustmentDto,
  ): Promise<WarehouseAdjustmentResponseDto> {
    return this.warehouseAdjustmentService.create(createWarehouseAdjustmentDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query() queryDto: WarehouseAdjustmentQueryDto,
  ): Promise<PaginatedResponse<WarehouseAdjustmentResponseDto>> {
    return this.warehouseAdjustmentService.findAll(paginationDto, queryDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    return this.warehouseAdjustmentService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.warehouseAdjustmentService.remove(id);
  }

  @Post(':id/process')
  processAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    return this.warehouseAdjustmentService.processAdjustment(id);
  }

  // Rutas para detalles de ajuste
  @Post(':id/details')
  createDetail(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Body() createDetailDto: CreateWarehouseAdjustmentDetailDto,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    return this.warehouseAdjustmentService.createDetail(
      adjustmentId,
      createDetailDto,
    );
  }

  @Get(':id/details')
  findAllDetails(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Query() queryDto: WarehouseAdjustmentDetailQueryDto,
  ): Promise<PaginatedResponse<WarehouseAdjustmentDetailResponseDto>> {
    return this.warehouseAdjustmentService.findAllDetails(
      adjustmentId,
      queryDto,
    );
  }

  @Get(':id/details/:detailId')
  findOneDetail(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    return this.warehouseAdjustmentService.findOneDetail(
      adjustmentId,
      detailId,
    );
  }

  @Put(':id/details/:detailId')
  updateDetail(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @Body() updateDetailDto: UpdateWarehouseAdjustmentDetailDto,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    return this.warehouseAdjustmentService.updateDetail(
      adjustmentId,
      detailId,
      updateDetailDto,
    );
  }

  @Delete(':id/details/:detailId')
  removeDetail(
    @Param('id', ParseUUIDPipe) adjustmentId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
  ): Promise<void> {
    return this.warehouseAdjustmentService.removeDetail(adjustmentId, detailId);
  }
}
