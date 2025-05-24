import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ProductHistoryService } from '../services/product-history.service';
import { CreateProductHistoryDto } from '../dtos/product-history/create-product-history.dto';
import { ProductHistoryResponseDto } from '../dtos/product-history/product-history-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Controller('product-history')
export class ProductHistoryController {
  constructor(private readonly productHistoryService: ProductHistoryService) {}

  @Post()
  create(
    @Body() createProductHistoryDto: CreateProductHistoryDto,
  ): Promise<ProductHistoryResponseDto> {
    return this.productHistoryService.create(createProductHistoryDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProductHistoryResponseDto>> {
    return this.productHistoryService.findAll(paginationDto);
  }

  @Get('product/:productId/warehouse/:warehouseId')
  findByProduct(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProductHistoryResponseDto>> {
    return this.productHistoryService.findByProduct(
      productId,
      warehouseId,
      paginationDto,
    );
  }

  @Get('stock/product/:productId/warehouse/:warehouseId')
  getCurrentStock(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
  ): Promise<number> {
    return this.productHistoryService.getCurrentStock(productId, warehouseId);
  }
}
