import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
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
import { InventoryPackSyncService } from './inventory-pack-sync.service';
import { TenantContext } from './tenant-context.service';
import { UserAttributionService } from './user-attribution.service';

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
    private readonly inventoryPackSyncService: InventoryPackSyncService,
    private readonly tenantContext: TenantContext,
    private readonly userAttributionService: UserAttributionService,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

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
      pack_product_id: inventory.pack_product_id ?? null,
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
      pack_product_id: inventory.pack_product_id ?? null,
      batch_number: inventory.batch_number,
      expiration_date: inventory.expiration_date,
      createdAt: inventory.created_at,
    };
  }

  async create(
    createInventoryDto: CreateInventoryDto,
    userId?: string,
  ): Promise<InventoryResponseDto> {
    const inventory = this.inventoryRepository.create({
      warehouse: { id: createInventoryDto.warehouseId },
      product: { id: createInventoryDto.productId },
      quantity: createInventoryDto.quantity,
      price: createInventoryDto.price,
      organization_id: this.organizationId,
    });
    const savedInventory = await this.inventoryRepository.save(inventory);

    // Update denormalized total_stock
    await this.productService.updateStock(
      createInventoryDto.productId,
      savedInventory.quantity,
    );

    return this.mapToResponseDto(savedInventory);
  }

  async findAll(
    queryDto: InventoryQueryDto,
    userId?: string,
  ): Promise<PaginatedResponse<InventoryListResponseDto>> {
    const { page = 1, limit = 10, warehouse_id, term, brand_id, category_id } = queryDto;
    const product_id = (queryDto as any).product_id;
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      organization_id: this.organizationId,
    };

    let authorizedWarehouseIds: string[] | null = null;
    if (userId) {
      authorizedWarehouseIds = await this.userAttributionService.getAuthorizedWarehouseIds(userId);
    }

    if (warehouse_id) {
      if (userId && authorizedWarehouseIds !== null && authorizedWarehouseIds.length > 0 && !authorizedWarehouseIds.includes(warehouse_id)) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
      whereConditions.warehouse = { id: warehouse_id };
    } else if (userId && authorizedWarehouseIds !== null && authorizedWarehouseIds.length > 0) {
      whereConditions.warehouse = { id: In(authorizedWarehouseIds) };
    } else if (userId && authorizedWarehouseIds !== null) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    if (product_id) {
      whereConditions.product = { id: product_id };
    }
    if (brand_id) {
      if (!whereConditions.product) {
        whereConditions.product = {};
      }
      whereConditions.product.brand = { id: brand_id };
    }
    if (category_id) {
      if (!whereConditions.product) {
        whereConditions.product = {};
      }
      whereConditions.product.category = { id: category_id };
    }

    const [inventory, total] = await this.inventoryRepository.findAndCount({
      where: whereConditions,
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'product.prices',
        'warehouse',
      ],
      withDeleted: false,
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    // Filtrar por term si se proporciona
    let filteredInventory = inventory;
    if (term) {
      const lowerTerm = term.toLowerCase();
      filteredInventory = inventory.filter((item) => {
        return (
          item.product.name.toLowerCase().includes(lowerTerm) ||
          item.product.sku.toLowerCase().includes(lowerTerm) ||
          (item.product.barcode && item.product.barcode.toLowerCase().includes(lowerTerm)) ||
          (item.product.description && item.product.description.toLowerCase().includes(lowerTerm))
        );
      });
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
      where: { id, organization_id: this.organizationId },
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
      where: { id, organization_id: this.organizationId },
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

    const oldQuantity = Number(inventory.quantity);
    const newQuantity =
      updateInventoryDto.stock !== undefined
        ? Number(updateInventoryDto.stock)
        : oldQuantity;
    const diff = newQuantity - oldQuantity;

    const updatedInventory = await this.inventoryRepository.save({
      ...inventory,
      quantity: newQuantity,
      ...updateInventoryDto,
    });

    if (diff !== 0 && inventory.product && inventory.product.id) {
      // Update denormalized total_stock
      await this.productService.updateStock(inventory.product.id, diff);
    }

    return this.mapToResponseDto(updatedInventory);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id, organization_id: this.organizationId },
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

    const quantityToRemove = Number(inventory.quantity);
    await this.inventoryRepository.softRemove(inventory);

    // Update denormalized total_stock
    if (inventory.product && inventory.product.id) {
      await this.productService.updateStock(
        inventory.product.id,
        -quantityToRemove,
      );
    }
  }

  /**
   * Resincroniza el producto del inventario con el pack (PAC/Facturapi).
   * Crea o actualiza el producto en el pack según corresponda (incl. precios).
   */
  async syncWithPack(
    id: string,
    userId?: string,
  ): Promise<{
    inventory: InventoryListResponseDto;
    pack_sync_success: boolean;
    pack_sync_error?: string;
  }> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['product', 'product.measurement_unit', 'warehouse'],
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
    const result =
      await this.inventoryPackSyncService.syncForInventory(inventory);
    return {
      inventory: this.mapToListResponseDto(result.inventory),
      pack_sync_success: result.packSyncSuccess,
      pack_sync_error: result.packErrorMessage,
    };
  }

  /**
   * Obtiene todos los productos en inventario con su cantidad y precio total
   * agrupados por producto, con paginación y búsqueda por nombre.
   * También incluye productos de tipo service/digital que no requieren almacén.
   */
  async findAllProductsInInventory(
    queryDto: InventoryQueryDto,
    userId?: string,
  ): Promise<PaginatedResponse<InventoryListResponseDto>> {
    const { page = 1, limit = 10, warehouse_id, term } = queryDto;
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      organization_id: this.organizationId,
    };

    let authorizedWarehouseIds: string[] | null = null;
    if (userId) {
      authorizedWarehouseIds = await this.userAttributionService.getAuthorizedWarehouseIds(userId);
    }

    if (warehouse_id) {
      if (userId && authorizedWarehouseIds !== null && authorizedWarehouseIds.length > 0 && !authorizedWarehouseIds.includes(warehouse_id)) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
      whereConditions.warehouse = { id: warehouse_id };
    } else if (userId && authorizedWarehouseIds !== null && authorizedWarehouseIds.length > 0) {
      whereConditions.warehouse = { id: In(authorizedWarehouseIds) };
    } else if (userId && authorizedWarehouseIds !== null) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const [inventory] = await this.inventoryRepository.findAndCount({
      where: whereConditions,
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.taxes',
        'product.measurement_unit',
        'product.prices',
        'warehouse',
        'warehouse.currency',
      ],
      order: { product: { name: 'ASC' }, quantity: 'DESC' },
    });

    let filteredInventory = inventory.filter((item) => item.quantity > 0);

    let serviceDigitalItems: InventoryListResponseDto[] = [];
    if (!warehouse_id) {
      const nonTangibleProducts =
        await this.productService.findNonTangibleActive(this.organizationId);

      const inventoryProductIds = new Set(
        filteredInventory.map((i) => i.product.id),
      );

      serviceDigitalItems = nonTangibleProducts
        .filter((p) => !inventoryProductIds.has(p.id))
        .map((p) => ({
          id: p.id,
          product: this.productMapper.mapToResponseDto(p),
          warehouse: null,
          quantity: null,
          price: Number(p.base_price) || 0,
          pack_product_id: null,
          createdAt: p.created_at,
        }));
    }

    if (term) {
      const searchTerm = term.toLowerCase();
      filteredInventory = filteredInventory.filter(
        (item) =>
          item.product.name.toLowerCase().includes(searchTerm) ||
          item.product.sku.toLowerCase().includes(searchTerm) ||
          (item.product.barcode &&
            item.product.barcode.toLowerCase().includes(searchTerm)) ||
          (item.product.description &&
            item.product.description.toLowerCase().includes(searchTerm)),
      );
      serviceDigitalItems = serviceDigitalItems.filter(
        (item) =>
          item.product.name.toLowerCase().includes(searchTerm) ||
          item.product.sku.toLowerCase().includes(searchTerm) ||
          (item.product.barcode &&
            item.product.barcode.toLowerCase().includes(searchTerm)) ||
          (item.product.description &&
            item.product.description.toLowerCase().includes(searchTerm)),
      );
    }

    const tangibleData = filteredInventory.map((item) =>
      this.mapToListResponseDto(item),
    );

    const combined = [...tangibleData, ...serviceDigitalItems];

    const total = combined.length;
    const paginated = combined.slice(skip, skip + limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
