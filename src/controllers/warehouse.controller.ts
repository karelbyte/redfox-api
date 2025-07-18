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
  Patch,
} from '@nestjs/common';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto } from '../dtos/warehouse/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dtos/warehouse/update-warehouse.dto';
import { WarehouseResponseDto } from '../dtos/warehouse/warehouse-response.dto';
import { WarehouseSimpleResponseDto } from '../dtos/warehouse/warehouse-simple-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UpdateWarehouseStatusDto } from 'src/dtos/warehouse/update-warehouse-status.dto';
import { CloseWarehouseResponseDto } from '../dtos/warehouse/close-warehouse-response.dto';
import { UserId } from '../decorators/user-id.decorator';

@Controller('warehouses')
@UseGuards(AuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  create(
    @Body() createWarehouseDto: CreateWarehouseDto,
    @UserId() userId: string,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.create(createWarehouseDto, userId);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<WarehouseResponseDto>> {
    return this.warehouseService.findAll(paginationDto);
  }

  @Get('closed')
  findClosed(): Promise<WarehouseSimpleResponseDto[]> {
    return this.warehouseService.findClosed();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
    @UserId() userId: string,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.update(id, updateWarehouseDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.warehouseService.remove(id, userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateWarehouseStatusDto,
    @UserId() userId: string,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.updateStatus(id, updateStatusDto, userId);
  }

  @Post(':id/close')
  closeWarehouse(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<CloseWarehouseResponseDto> {
    return this.warehouseService.closeWarehouse(id, userId);
  }
}
