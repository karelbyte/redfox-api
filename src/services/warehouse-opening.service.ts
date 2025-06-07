import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { CreateWarehouseOpeningDto } from '../dtos/warehouse-opening/create-warehouse-opening.dto';
import { WarehouseOpeningResponseDto } from '../dtos/warehouse-opening/warehouse-opening-response.dto';
import { UpdateWarehouseOpeningDto } from '../dtos/warehouse-opening/update-warehouse-opening.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

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

    // Recargar con relaciones para la respuesta
    const savedWithRelations = await this.warehouseOpeningRepository.findOne({
      where: { id: saved.id },
      relations: [
        'warehouse',
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
      ],
    });

    if (!savedWithRelations) {
      throw new NotFoundException('Warehouse opening not found after creation');
    }

    return this.mapToResponseDto(savedWithRelations);
  }

  async findAll(
    paginationDto: PaginationDto,
    warehouseId: string,
  ): Promise<PaginatedResponse<WarehouseOpeningResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [warehouseOpenings, total] =
      await this.warehouseOpeningRepository.findAndCount({
        where: { warehouseId },
        relations: [
          'warehouse',
          'product',
          'product.brand',
          'product.category',
          'product.tax',
          'product.measurement_unit',
        ],
        skip,
        take: limit,
      });

    const data = warehouseOpenings.map((opening) =>
      this.mapToResponseDto(opening),
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

  async findOne(id: string): Promise<WarehouseOpeningResponseDto> {
    const warehouseOpening = await this.warehouseOpeningRepository.findOne({
      where: { id },
      relations: [
        'warehouse',
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
      ],
    });
    if (!warehouseOpening) {
      throw new NotFoundException('Warehouse opening not found');
    }
    return this.mapToResponseDto(warehouseOpening);
  }

  async update(
    id: string,
    updateWarehouseOpeningDto: UpdateWarehouseOpeningDto,
  ): Promise<WarehouseOpeningResponseDto> {
    const warehouseOpening = await this.warehouseOpeningRepository.findOne({
      where: { id },
      relations: [
        'warehouse',
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
      ],
    });
    if (!warehouseOpening) {
      throw new NotFoundException('Warehouse opening not found');
    }

    const updated = await this.warehouseOpeningRepository.save({
      ...warehouseOpening,
      ...updateWarehouseOpeningDto,
    });

    // Recargar con relaciones para la respuesta
    const updatedWithRelations = await this.warehouseOpeningRepository.findOne({
      where: { id: updated.id },
      relations: [
        'warehouse',
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
      ],
    });

    if (!updatedWithRelations) {
      throw new NotFoundException('Warehouse opening not found after update');
    }

    return this.mapToResponseDto(updatedWithRelations);
  }

  async remove(id: string): Promise<void> {
    const warehouseOpening = await this.warehouseOpeningRepository.findOne({
      where: { id },
    });

    if (!warehouseOpening) {
      throw new NotFoundException('Warehouse opening not found');
    }

    await this.warehouseOpeningRepository.softDelete(id);
  }

  private mapToResponseDto(
    warehouseOpening: WarehouseOpening,
  ): WarehouseOpeningResponseDto {
    return {
      id: warehouseOpening.id,
      warehouseId: warehouseOpening.warehouseId,
      product: {
        id: warehouseOpening.product.id,
        name: warehouseOpening.product.name,
        slug: warehouseOpening.product.slug,
        description: warehouseOpening.product.description,
        sku: warehouseOpening.product.sku,
        weight: warehouseOpening.product.weight,
        width: warehouseOpening.product.width,
        height: warehouseOpening.product.height,
        length: warehouseOpening.product.length,
        brand: warehouseOpening.product.brand,
        category: warehouseOpening.product.category,
        tax: warehouseOpening.product.tax,
        measurement_unit: warehouseOpening.product.measurement_unit,
        is_active: warehouseOpening.product.is_active,
        type: warehouseOpening.product.type,
        images: warehouseOpening.product.images
          ? (JSON.parse(warehouseOpening.product.images) as string[])
          : [],
        created_at: warehouseOpening.product.created_at,
      },
      quantity: warehouseOpening.quantity,
      price: warehouseOpening.price,
      createdAt: warehouseOpening.createdAt,
    };
  }
}
