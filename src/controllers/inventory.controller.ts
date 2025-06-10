import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { CreateInventoryDto } from '../dtos/inventory/create-inventory.dto';
import { UpdateInventoryDto } from '../dtos/inventory/update-inventory.dto';
import { InventoryResponseDto } from '../dtos/inventory/inventory-response.dto';
import { InventoryListResponseDto } from '../dtos/inventory/inventory-list-response.dto';
import { InventoryQueryDto } from '../dtos/inventory/inventory-query.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(
    @Body() createInventoryDto: CreateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  findAll(
    @Query() queryDto: InventoryQueryDto,
  ): Promise<PaginatedResponse<InventoryListResponseDto>> {
    return this.inventoryService.findAll(queryDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.inventoryService.remove(id);
  }
}
