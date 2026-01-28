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
import { UserId } from '../decorators/user-id.decorator';

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(
    @Body() createInventoryDto: CreateInventoryDto,
    @UserId() userId: string,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.create(createInventoryDto, userId);
  }

  @Get()
  findAll(
    @UserId() userId: string,
    @Query() queryDto: InventoryQueryDto,
  ): Promise<PaginatedResponse<InventoryListResponseDto>> {
    return this.inventoryService.findAll(queryDto, userId);
  }

  @Get('products')
  findAllProductsInInventory(
    @UserId() userId: string,
    @Query() queryDto: InventoryQueryDto,
  ): Promise<PaginatedResponse<InventoryListResponseDto>> {
    return this.inventoryService.findAllProductsInInventory(queryDto, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
    @UserId() userId: string,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.update(id, updateInventoryDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.inventoryService.remove(id, userId);
  }

  @Post(':id/sync-pack')
  syncWithPack(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<{
    inventory: InventoryListResponseDto;
    pack_sync_success: boolean;
    pack_sync_error?: string;
  }> {
    return this.inventoryService.syncWithPack(id, userId);
  }
}
