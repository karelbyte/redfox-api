import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../models/warehouse.entity';
import { CreateWarehouseDto } from '../dtos/warehouse/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dtos/warehouse/update-warehouse.dto';
import { WarehouseResponseDto } from '../dtos/warehouse/warehouse-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  private mapToResponseDto(warehouse: Warehouse): WarehouseResponseDto {
    const { id, code, name, address, phone, status, created_at } = warehouse;
    return {
      id,
      code,
      name,
      address,
      phone,
      status,
      created_at,
    };
  }

  async create(
    createWarehouseDto: CreateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = this.warehouseRepository.create(createWarehouseDto);
    const savedWarehouse = await this.warehouseRepository.save(warehouse);
    return this.mapToResponseDto(savedWarehouse);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<WarehouseResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [warehouses, total] = await this.warehouseRepository.findAndCount({
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
    });

    if (!warehouse) {
      throw new NotFoundException(`Almacén con ID ${id} no encontrado`);
    }

    const updatedWarehouse = await this.warehouseRepository.save({
      ...warehouse,
      ...updateWarehouseDto,
    });

    return this.mapToResponseDto(updatedWarehouse);
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
}
