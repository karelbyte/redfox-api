import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Inventory } from '../models/inventory.entity';
import { CreateInventoryDto } from '../dtos/inventory/create-inventory.dto';
import { UpdateInventoryDto } from '../dtos/inventory/update-inventory.dto';
import { InventoryResponseDto } from '../dtos/inventory/inventory-response.dto';
import { InventoryListResponseDto } from '../dtos/inventory/inventory-list-response.dto';
import { InventoryQueryDto } from '../dtos/inventory/inventory-query.dto';
import { ProductService } from './product.service';
import { ProductMapper } from './mappers/product.mapper';
import { WarehouseService } from './warehouse.service';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TranslationService } from './translation.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    private readonly productService: ProductService,
    private readonly productMapper: ProductMapper,
    private readonly warehouseService: WarehouseService,
    private readonly warehouseMapper: WarehouseMapper,
    private translationService: TranslationService,
  ) {}

  private async mapToResponseDto(
    inventory: Inventory,
  ): Promise<InventoryResponseDto> {
    const [product, warehouse] = await Promise.all([
      this.productService.findOne(inventory.product.id),
      this.warehouseService.findOne(inventory.warehouse.id),
    ]);

    return {
      id: inventory.id,
      warehouse,
      product,
      quantity: inventory.quantity,
      price: inventory.price,
      createdAt: inventory.created_at,
      updatedAt: inventory.updated_at,
    };
  }

  private mapToListResponseDto(inventory: Inventory): InventoryListResponseDto {
    const product = this.productMapper.mapToResponseDto(inventory.product);
    const warehouse = this.warehouseMapper.mapToResponseDto(
      inventory.warehouse,
    );

    return {
      id: inventory.id,
      product,
      warehouse,
      quantity: inventory.quantity,
      price: inventory.price,
      createdAt: inventory.created_at,
    };
  }

  async create(
    createInventoryDto: CreateInventoryDto,
    userId?: string,
  ): Promise<InventoryResponseDto> {
    const inventory = this.inventoryRepository.create(createInventoryDto);
    const savedInventory = await this.inventoryRepository.save(inventory);
    return this.mapToResponseDto(savedInventory);
  }

  async findAll(
    queryDto: InventoryQueryDto,
    userId?: string,
  ): Promise<PaginatedResponse<InventoryListResponseDto>> {
    const { page = 1, limit = 10, warehouse_id, term } = queryDto;
    const skip = (page - 1) * limit;

    const whereConditions: FindOptionsWhere<Inventory> = {};
    if (warehouse_id) {
      whereConditions.warehouse = { id: warehouse_id };
    }

    const [inventory, total] = await this.inventoryRepository.findAndCount({
      where: whereConditions,
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'warehouse',
      ],
      withDeleted: false,
      skip,
      take: limit,
    });

    // Filtrar por término de búsqueda si se proporciona
    let filteredInventory = inventory;
    if (term) {
      const searchTerm = term.toLowerCase();
      filteredInventory = inventory.filter(
        (item) =>
          item.product.name.toLowerCase().includes(searchTerm) ||
          item.product.sku.toLowerCase().includes(searchTerm) ||
          (item.product.description &&
            item.product.description.toLowerCase().includes(searchTerm)),
      );
    }

    const data = filteredInventory.map((item) =>
      this.mapToListResponseDto(item),
    );

    return {
      data,
      meta: {
        total: term ? filteredInventory.length : total,
        page,
        limit,
        totalPages: Math.ceil(
          (term ? filteredInventory.length : total) / limit,
        ),
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<InventoryResponseDto> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['product'],
      withDeleted: false,
    });
    if (!inventory) {
      const message = await this.translationService.translate(
        'inventory.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.mapToResponseDto(inventory);
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
    userId?: string,
  ): Promise<InventoryResponseDto> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['product'],
      withDeleted: false,
    });
    if (!inventory) {
      const message = await this.translationService.translate(
        'inventory.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    const updatedInventory = await this.inventoryRepository.save({
      ...inventory,
      ...updateInventoryDto,
    });
    return this.mapToResponseDto(updatedInventory);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!inventory) {
      const message = await this.translationService.translate(
        'inventory.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    await this.inventoryRepository.softRemove(inventory);
  }

  /**
   * Obtiene todos los productos en inventario con su cantidad y precio total
   * agrupados por producto, con paginación y búsqueda por nombre
   */
  async findAllProductsInInventory(
    queryDto: InventoryQueryDto,
    userId?: string,
  ): Promise<PaginatedResponse<InventoryListResponseDto>> {
    const { page = 1, limit = 10, warehouse_id, term } = queryDto;
    const skip = (page - 1) * limit;

    // Construir condiciones de búsqueda
    const whereConditions: any = {};

    if (warehouse_id) {
      whereConditions.warehouse = { id: warehouse_id };
    }

    const [inventory] = await this.inventoryRepository.findAndCount({
      where: whereConditions,
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'warehouse',
        'warehouse.currency',
      ],
      skip,
      take: limit,
      order: {
        product: {
          name: 'ASC',
        },
        quantity: 'DESC',
      },
    });

    // Filtrar por cantidad > 0 y término de búsqueda en memoria
    let filteredInventory = inventory.filter((item) => item.quantity > 0);

    if (term) {
      const searchTerm = term.toLowerCase();
      filteredInventory = filteredInventory.filter(
        (item) =>
          item.product.name.toLowerCase().includes(searchTerm) ||
          item.product.sku.toLowerCase().includes(searchTerm) ||
          (item.product.description &&
            item.product.description.toLowerCase().includes(searchTerm)),
      );
    }

    const data = filteredInventory.map((item) =>
      this.mapToListResponseDto(item),
    );

    return {
      data,
      meta: {
        total: filteredInventory.length,
        page,
        limit,
        totalPages: Math.ceil(filteredInventory.length / limit),
      },
    };
  }
}
