import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { WarehouseOpeningService } from '../services/warehouse-opening.service';
import { CreateWarehouseOpeningDto } from '../dtos/warehouse-opening/create-warehouse-opening.dto';
import { WarehouseOpeningResponseDto } from '../dtos/warehouse-opening/warehouse-opening-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UpdateWarehouseOpeningDto } from '../dtos/warehouse-opening/update-warehouse-opening.dto';

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
  findAll(): Promise<WarehouseOpeningResponseDto[]> {
    return this.warehouseOpeningService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<WarehouseOpeningResponseDto> {
    return this.warehouseOpeningService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWarehouseOpeningDto: UpdateWarehouseOpeningDto,
  ): Promise<WarehouseOpeningResponseDto> {
    return this.warehouseOpeningService.update(id, updateWarehouseOpeningDto);
  }
}
