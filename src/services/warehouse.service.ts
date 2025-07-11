import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../models/warehouse.entity';
import { CreateWarehouseDto } from '../dtos/warehouse/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dtos/warehouse/update-warehouse.dto';
import { WarehouseResponseDto } from '../dtos/warehouse/warehouse-response.dto';
import { WarehouseSimpleResponseDto } from '../dtos/warehouse/warehouse-simple-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { UpdateWarehouseStatusDto } from 'src/dtos/warehouse/update-warehouse-status.dto';
import { CloseWarehouseResponseDto } from '../dtos/warehouse/close-warehouse-response.dto';
import { CurrencyMapper } from './mappers/currency.mapper';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { Inventory } from '../models/inventory.entity';
import {
  ProductHistory,
  OperationType,
} from '../models/product-history.entity';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { TranslationService } from './translation.service';
import { Like } from 'typeorm';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(WarehouseOpening)
    private warehouseOpeningRepository: Repository<WarehouseOpening>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(ProductHistory)
    private productHistoryRepository: Repository<ProductHistory>,
    private readonly currencyMapper: CurrencyMapper,
    private readonly warehouseMapper: WarehouseMapper,
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createWarehouseDto: CreateWarehouseDto,
    userId?: string,
  ): Promise<WarehouseResponseDto> {
    try {
      const warehouse = this.warehouseRepository.create(createWarehouseDto);
      const savedWarehouse = await this.warehouseRepository.save(warehouse);

      // Recargar con relaciones para la respuesta
      const warehouseWithRelations = await this.warehouseRepository.findOne({
        where: { id: savedWarehouse.id },
        relations: ['currency'],
      });

      if (!warehouseWithRelations) {
        const message = await this.translationService.translate(
          'warehouse.not_found',
          userId,
        );
        throw new NotFoundException(message);
      }

      return this.warehouseMapper.mapToResponseDto(warehouseWithRelations);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('warehouses.UQ_')
      ) {
        const message = await this.translationService.translate(
          'warehouse.already_exists',
          userId,
          { code: createWarehouseDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<WarehouseResponseDto>> {
    const { page, limit, term, isClosed } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = {
      relations: ['currency'],
      withDeleted: false,
    };

    // Construir condiciones de where
    let whereConditions;

    if (isClosed !== undefined && term) {
      // Si hay filtro de estado y término de búsqueda
      whereConditions = {
        ...baseConditions,
        where: [
          { code: Like(`%${term}%`), isOpen: !isClosed },
          { name: Like(`%${term}%`), isOpen: !isClosed },
          { address: Like(`%${term}%`), isOpen: !isClosed },
        ],
      };
    } else if (isClosed !== undefined) {
      // Solo filtro de estado
      whereConditions = {
        ...baseConditions,
        where: { isOpen: !isClosed },
      };
    } else if (term) {
      // Solo término de búsqueda
      whereConditions = {
        ...baseConditions,
        where: [
          { code: Like(`%${term}%`) },
          { name: Like(`%${term}%`) },
          { address: Like(`%${term}%`) },
        ],
      };
    } else {
      // Sin filtros
      whereConditions = baseConditions;
    }

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const warehouses = await this.warehouseRepository.find(whereConditions);

      const data = warehouses.map((warehouse) =>
        this.warehouseMapper.mapToResponseDto(warehouse),
      );

      return {
        data,
        meta: {
          total: data.length,
          page: 1,
          limit: data.length,
          totalPages: 1,
        },
      };
    }

    // Si se proporciona paginación, aplicar la lógica de paginación
    const currentPage = page || 1;
    const currentLimit = limit || 10;
    const skip = (currentPage - 1) * currentLimit;

    console.log(whereConditions);

    const [warehouses, total] = await this.warehouseRepository.findAndCount({
      ...whereConditions,
      skip,
      take: currentLimit,
      order: {
        created_at: 'DESC',
      },
    });

    const data = warehouses.map((warehouse) =>
      this.warehouseMapper.mapToResponseDto(warehouse),
    );

    return {
      data,
      meta: {
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(total / currentLimit),
      },
    };
  }

  async findClosed(): Promise<WarehouseSimpleResponseDto[]> {
    const warehouses = await this.warehouseRepository.find({
      where: { isOpen: false },
      select: ['id', 'code', 'name'],
      order: {
        created_at: 'DESC',
      },
    });

    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
    }));
  }

  async findOne(id: string, userId?: string): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['currency'],
    });

    if (!warehouse) {
      const message = await this.translationService.translate(
        'warehouse.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.warehouseMapper.mapToResponseDto(warehouse);
  }

  async update(
    id: string,
    updateWarehouseDto: UpdateWarehouseDto,
    userId?: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['currency'],
    });

    if (!warehouse) {
      const message = await this.translationService.translate(
        'warehouse.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    try {
      const updatedWarehouse = await this.warehouseRepository.save({
        ...warehouse,
        ...updateWarehouseDto,
      });

      // Recargar con relaciones para la respuesta
      const warehouseWithRelations = await this.warehouseRepository.findOne({
        where: { id: updatedWarehouse.id },
        relations: ['currency'],
      });

      if (!warehouseWithRelations) {
        const message = await this.translationService.translate(
          'warehouse.not_found',
          userId,
        );
        throw new NotFoundException(message);
      }

      return this.warehouseMapper.mapToResponseDto(warehouseWithRelations);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('warehouses.UQ_')
      ) {
        const message = await this.translationService.translate(
          'warehouse.already_exists',
          userId,
          { code: updateWarehouseDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
    });

    if (!warehouse) {
      const message = await this.translationService.translate(
        'warehouse.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.warehouseRepository.softRemove(warehouse);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateWarehouseStatusDto,
    userId?: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['currency'],
    });
    if (!warehouse) {
      const message = await this.translationService.translate(
        'warehouse.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    warehouse.isOpen = updateStatusDto.isOpen;
    const updated = await this.warehouseRepository.save(warehouse);
    // Recargar con relaciones para la respuesta
    const warehouseWithRelations = await this.warehouseRepository.findOne({
      where: { id: updated.id },
      relations: ['currency'],
    });

    if (!warehouseWithRelations) {
      const message = await this.translationService.translate(
        'warehouse.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    return this.warehouseMapper.mapToResponseDto(warehouseWithRelations);
  }

  async closeWarehouse(
    warehouseId: string,
    userId?: string,
  ): Promise<CloseWarehouseResponseDto> {
    // Verificar que el warehouse existe y está abierto
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId },
      relations: ['currency'],
    });

    if (!warehouse) {
      const message = await this.translationService.translate(
        'warehouse.not_found',
        userId,
        { id: warehouseId },
      );
      throw new NotFoundException(message);
    }

    if (!warehouse.isOpen) {
      const message = await this.translationService.translate(
        'warehouse.already_closed',
        userId,
      );
      throw new BadRequestException(message);
    }

    // Obtener todos los warehouse openings de este almacén
    const warehouseOpenings = await this.warehouseOpeningRepository.find({
      where: { warehouseId },
      relations: ['product'],
    });

    let transferredProducts = 0;
    let totalQuantity = 0;

    // Procesar cada producto de warehouse opening (si los hay)
    for (const opening of warehouseOpenings) {
      // Buscar si el producto ya existe en inventory
      const existingInventory = await this.inventoryRepository.findOne({
        where: {
          product: { id: opening.product.id },
          warehouse: { id: warehouseId },
        },
        relations: ['product', 'warehouse'],
      });

      let finalInventory: Inventory;

      if (existingInventory) {
        // Si existe, sumar las cantidades
        existingInventory.quantity =
          Number(existingInventory.quantity) + Number(opening.quantity);
        // Actualizar precio con el promedio ponderado
        const totalValue =
          Number(existingInventory.price) *
            (Number(existingInventory.quantity) - Number(opening.quantity)) +
          Number(opening.price) * Number(opening.quantity);
        existingInventory.price =
          totalValue / Number(existingInventory.quantity);

        finalInventory = await this.inventoryRepository.save(existingInventory);
      } else {
        // Si no existe, crear nuevo registro en inventory
        const newInventory = this.inventoryRepository.create({
          product: opening.product,
          warehouse: warehouse,
          quantity: opening.quantity,
          price: opening.price,
        });

        finalInventory = await this.inventoryRepository.save(newInventory);
      }

      // Crear registro en ProductHistory con ID real del WarehouseOpening
      const productHistory = this.productHistoryRepository.create({
        product: opening.product,
        warehouse: warehouse,
        operation_type: OperationType.WAREHOUSE_OPENING,
        operation_id: opening.id, // ID real del WarehouseOpening
        quantity: Number(opening.quantity),
        current_stock: Number(finalInventory.quantity),
      });

      await this.productHistoryRepository.save(productHistory);

      transferredProducts++;
      totalQuantity += Number(opening.quantity);

      // Eliminar el warehouse opening
      await this.warehouseOpeningRepository.remove(opening);
    }

    // Cerrar el almacén
    warehouse.isOpen = false;
    await this.warehouseRepository.save(warehouse);

    // Retornar resumen de la operación
    const message =
      transferredProducts > 0
        ? `Almacén cerrado exitosamente. ${transferredProducts} productos transferidos al inventario.`
        : 'Almacén cerrado exitosamente. No había productos en apertura para transferir.';

    return {
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      transferredProducts,
      totalQuantity,
      message,
      closedAt: new Date(),
    };
  }
}
