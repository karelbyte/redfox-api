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
import { UserId } from '../decorators/user-id.decorator';

@Controller('warehouse-openings')
@UseGuards(AuthGuard)
export class WarehouseOpeningController {
  constructor(
    private readonly warehouseOpeningService: WarehouseOpeningService,
  ) {}

  @Post()
  create(
    @Body() createWarehouseOpeningDto: CreateWarehouseOpeningDto,
    @UserId() userId: string,
  ): Promise<WarehouseOpeningResponseDto> {
    return this.warehouseOpeningService.create(createWarehouseOpeningDto, userId);
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
    @UserId() userId: string,
  ): Promise<WarehouseOpeningResponseDto> {
    return this.warehouseOpeningService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWarehouseOpeningDto: UpdateWarehouseOpeningDto,
    @UserId() userId: string,
  ): Promise<WarehouseOpeningResponseDto> {
    return this.warehouseOpeningService.update(id, updateWarehouseOpeningDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.warehouseOpeningService.remove(id, userId);
  }
}
