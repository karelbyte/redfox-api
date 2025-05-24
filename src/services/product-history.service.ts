import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProductHistory,
  OperationType,
} from '../models/product-history.entity';
import { CreateProductHistoryDto } from '../dtos/product-history/create-product-history.dto';
import { ProductHistoryResponseDto } from '../dtos/product-history/product-history-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class ProductHistoryService {
  constructor(
    @InjectRepository(ProductHistory)
    private productHistoryRepository: Repository<ProductHistory>,
  ) {}

  private mapToResponseDto(history: ProductHistory): ProductHistoryResponseDto {
    return {
      id: history.id,
      product: {
        id: history.product.id,
        code: history.product.code,
        description: history.product.description,
      },
      warehouse: {
        id: history.warehouse.id,
        code: history.warehouse.code,
        name: history.warehouse.name,
      },
      operation_type: history.operation_type,
      operation_id: history.operation_id,
      quantity: history.quantity,
      current_stock: history.current_stock,
      created_at: history.created_at,
    };
  }

  async create(
    createProductHistoryDto: CreateProductHistoryDto,
  ): Promise<ProductHistoryResponseDto> {
    // Obtener el último registro para calcular el stock actual
    const lastRecord = await this.productHistoryRepository.findOne({
      where: {
        product: { id: createProductHistoryDto.product_id },
        warehouse: { id: createProductHistoryDto.warehouse_id },
      },
      order: { created_at: 'DESC' },
    });

    const currentStock = lastRecord ? lastRecord.current_stock : 0;
    const newStock =
      createProductHistoryDto.operation_type === OperationType.ENTRY
        ? currentStock + createProductHistoryDto.quantity
        : currentStock - createProductHistoryDto.quantity;

    const history = this.productHistoryRepository.create({
      ...createProductHistoryDto,
      current_stock: newStock,
    });

    const savedHistory = await this.productHistoryRepository.save(history);
    return this.mapToResponseDto(savedHistory);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProductHistoryResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [history, total] = await this.productHistoryRepository.findAndCount({
      relations: ['product', 'warehouse'],
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const data = history.map((item) => this.mapToResponseDto(item));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByProduct(
    productId: string,
    warehouseId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProductHistoryResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [history, total] = await this.productHistoryRepository.findAndCount({
      where: {
        product: { id: productId },
        warehouse: { id: warehouseId },
      },
      relations: ['product', 'warehouse'],
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const data = history.map((item) => this.mapToResponseDto(item));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCurrentStock(
    productId: string,
    warehouseId: string,
  ): Promise<number> {
    const lastRecord = await this.productHistoryRepository.findOne({
      where: {
        product: { id: productId },
        warehouse: { id: warehouseId },
      },
      order: { created_at: 'DESC' },
    });

    return lastRecord ? lastRecord.current_stock : 0;
  }
}
