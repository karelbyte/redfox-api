import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../models/warehouse.entity';
import { CreateWarehouseDto } from '../dtos/warehouse/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dtos/warehouse/update-warehouse.dto';
import { WarehouseResponseDto } from '../dtos/warehouse/warehouse-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { UpdateWarehouseStatusDto } from 'src/dtos/warehouse/update-warehouse-status.dto';
import { CurrencyMapper } from './mappers/currency.mapper';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    private readonly currencyMapper: CurrencyMapper,
  ) {}

  private mapToResponseDto(warehouse: Warehouse): WarehouseResponseDto {
    const { id, code, name, address, phone, status, isOpen, created_at, currency } = warehouse;
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
}
