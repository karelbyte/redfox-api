import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { CreateWarehouseOpeningDto } from '../dtos/warehouse-opening/create-warehouse-opening.dto';
import { WarehouseOpeningResponseDto } from '../dtos/warehouse-opening/warehouse-opening-response.dto';
import { UpdateWarehouseOpeningDto } from '../dtos/warehouse-opening/update-warehouse-opening.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TranslationService } from './translation.service';

@Injectable()
export class WarehouseOpeningService {
  constructor(
    @InjectRepository(WarehouseOpening)
    private readonly warehouseOpeningRepository: Repository<WarehouseOpening>,
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createWarehouseOpeningDto: CreateWarehouseOpeningDto,
    userId?: string,
  ): Promise<WarehouseOpeningResponseDto> {
    try {
      const warehouseOpening = this.warehouseOpeningRepository.create({
        ...createWarehouseOpeningDto,
      });
      const saved =
        await this.warehouseOpeningRepository.save(warehouseOpening);

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
        const message = await this.translationService.translate(
          'warehouse_opening.not_found',
          userId,
        );
        throw new NotFoundException(message);
      }

      return this.mapToResponseDto(savedWithRelations);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('warehouse_openings.UQ_')
      ) {
        const message = await this.translationService.translate(
          'warehouse_opening.already_exists',
          userId,
          {
            product: createWarehouseOpeningDto.productId,
            warehouse: createWarehouseOpeningDto.warehouseId,
          },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
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

  async findOne(
    id: string,
    userId?: string,
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
      const message = await this.translationService.translate(
        'warehouse_opening.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.mapToResponseDto(warehouseOpening);
  }

  async update(
    id: string,
    updateWarehouseOpeningDto: UpdateWarehouseOpeningDto,
    userId?: string,
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
      const message = await this.translationService.translate(
        'warehouse_opening.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    try {
      const updated = await this.warehouseOpeningRepository.save({
        ...warehouseOpening,
        ...updateWarehouseOpeningDto,
      });

      // Recargar con relaciones para la respuesta
      const updatedWithRelations =
        await this.warehouseOpeningRepository.findOne({
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
        const message = await this.translationService.translate(
          'warehouse_opening.not_found',
          userId,
        );
        throw new NotFoundException(message);
      }

      return this.mapToResponseDto(updatedWithRelations);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('warehouse_openings.UQ_')
      ) {
        const message = await this.translationService.translate(
          'warehouse_opening.already_exists',
          userId,
          {
            product: updateWarehouseOpeningDto.productId,
            warehouse: updateWarehouseOpeningDto.warehouseId,
          },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const warehouseOpening = await this.warehouseOpeningRepository.findOne({
      where: { id },
    });

    if (!warehouseOpening) {
      const message = await this.translationService.translate(
        'warehouse_opening.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
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
        code: warehouseOpening.product.code,
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
