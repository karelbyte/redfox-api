import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { CreateWarehouseOpeningDto } from '../dtos/warehouse-opening/create-warehouse-opening.dto';
import { WarehouseOpeningResponseDto } from '../dtos/warehouse-opening/warehouse-opening-response.dto';

@Injectable()
export class WarehouseOpeningService {
  constructor(
    @InjectRepository(WarehouseOpening)
    private readonly warehouseOpeningRepository: Repository<WarehouseOpening>,
  ) {}

  async create(
    createWarehouseOpeningDto: CreateWarehouseOpeningDto,
  ): Promise<WarehouseOpeningResponseDto> {
    const warehouseOpening = this.warehouseOpeningRepository.create({
      ...createWarehouseOpeningDto,
    });
    const saved = await this.warehouseOpeningRepository.save(warehouseOpening);
    return this.mapToResponseDto(saved);
  }

  async findAll(): Promise<WarehouseOpeningResponseDto[]> {
    const warehouseOpenings = await this.warehouseOpeningRepository.find({
      relations: ['warehouse', 'product'],
    });
    return warehouseOpenings.map((opening) => this.mapToResponseDto(opening));
  }

  async findOne(id: string): Promise<WarehouseOpeningResponseDto> {
    const warehouseOpening = await this.warehouseOpeningRepository.findOne({
      where: { id },
      relations: ['warehouse', 'product'],
    });
    if (!warehouseOpening) {
      throw new NotFoundException('Warehouse opening not found');
    }
    return this.mapToResponseDto(warehouseOpening);
  }

  private mapToResponseDto(
    warehouseOpening: WarehouseOpening,
  ): WarehouseOpeningResponseDto {
    return {
      id: warehouseOpening.id,
      warehouseId: warehouseOpening.warehouseId,
      productId: warehouseOpening.productId,
      quantity: warehouseOpening.quantity,
      price: warehouseOpening.price,
      createdAt: warehouseOpening.createdAt,
      updatedAt: warehouseOpening.updatedAt,
    };
  }
}
