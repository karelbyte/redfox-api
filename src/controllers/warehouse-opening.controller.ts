import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Put,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WarehouseOpeningService } from '../services/warehouse-opening.service';
import { CreateWarehouseOpeningDto } from '../dtos/warehouse-opening/create-warehouse-opening.dto';
import { WarehouseOpeningResponseDto } from '../dtos/warehouse-opening/warehouse-opening-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UpdateWarehouseOpeningDto } from '../dtos/warehouse-opening/update-warehouse-opening.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Controller('warehouse-openings')
@UseGuards(AuthGuard)
export class WarehouseOpeningController {
  constructor(
    private readonly warehouseOpeningService: WarehouseOpeningService,
  ) {}

  @Post()
  create(
    @Body() createWarehouseOpeningDto: CreateWarehouseOpeningDto,
  ): Promise<WarehouseOpeningResponseDto> {
    return this.warehouseOpeningService.create(createWarehouseOpeningDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<PaginatedResponse<WarehouseOpeningResponseDto>> {
    return this.warehouseOpeningService.findAll(paginationDto, warehouseId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WarehouseOpeningResponseDto> {
    return this.warehouseOpeningService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWarehouseOpeningDto: UpdateWarehouseOpeningDto,
  ): Promise<WarehouseOpeningResponseDto> {
    return this.warehouseOpeningService.update(id, updateWarehouseOpeningDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.warehouseOpeningService.remove(id);
  }
}
