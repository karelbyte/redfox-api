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
  ) {}

  private mapToResponseDto(warehouse: Warehouse): WarehouseResponseDto {
    const {
      id,
      code,
      name,
      address,
      phone,
      status,
      isOpen,
      created_at,
      currency,
    } = warehouse;
    return {
      id,
      code,
      name,
      address,
      phone,
      status,
      is_open: isOpen,
      currency: this.currencyMapper.mapToResponseDto(currency),
      created_at,
    };
  }

  async create(
    createWarehouseDto: CreateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = this.warehouseRepository.create(createWarehouseDto);
    const savedWarehouse = await this.warehouseRepository.save(warehouse);

    // Recargar con relaciones para la respuesta
    const warehouseWithRelations = await this.warehouseRepository.findOne({
      where: { id: savedWarehouse.id },
      relations: ['currency'],
    });

    if (!warehouseWithRelations) {
      throw new NotFoundException('Warehouse not found after creation');
    }

    return this.mapToResponseDto(warehouseWithRelations);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<WarehouseResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [warehouses, total] = await this.warehouseRepository.findAndCount({
      relations: ['currency'],
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    const data = warehouses.map((warehouse) =>
      this.mapToResponseDto(warehouse),
    );

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

  async findOne(id: string): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['currency'],
    });

    if (!warehouse) {
      throw new NotFoundException(`Almacén con ID ${id} no encontrado`);
    }

    return this.mapToResponseDto(warehouse);
  }

  async update(
    id: string,
    updateWarehouseDto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['currency'],
    });

    if (!warehouse) {
      throw new NotFoundException(`Almacén con ID ${id} no encontrado`);
    }

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
      throw new NotFoundException('Warehouse not found after update');
    }

    return this.mapToResponseDto(warehouseWithRelations);
  }

  async remove(id: string): Promise<void> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Almacén con ID ${id} no encontrado`);
    }

    await this.warehouseRepository.softRemove(warehouse);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateWarehouseStatusDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['currency'],
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    warehouse.isOpen = updateStatusDto.isOpen;
    const updated = await this.warehouseRepository.save(warehouse);
    // Recargar con relaciones para la respuesta
    const warehouseWithRelations = await this.warehouseRepository.findOne({
      where: { id: updated.id },
      relations: ['currency'],
    });

    if (!warehouseWithRelations) {
      throw new NotFoundException('Warehouse not found after status update');
    }

    return this.mapToResponseDto(warehouseWithRelations);
  }

  async closeWarehouse(
    warehouseId: string,
  ): Promise<CloseWarehouseResponseDto> {
    // Verificar que el warehouse existe y está abierto
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId },
      relations: ['currency'],
    });

    if (!warehouse) {
      throw new NotFoundException(
        `Almacén con ID ${warehouseId} no encontrado`,
      );
    }

    if (!warehouse.isOpen) {
      throw new BadRequestException('El almacén ya está cerrado');
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
