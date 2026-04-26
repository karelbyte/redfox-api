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
import { ProductMapper } from './mappers/product.mapper';
import { ProductService } from './product.service';

import { TenantContext } from './tenant-context.service';

@Injectable()
export class WarehouseOpeningService {
  constructor(
    @InjectRepository(WarehouseOpening)
    private readonly warehouseOpeningRepository: Repository<WarehouseOpening>,
    private readonly translationService: TranslationService,
    private readonly productMapper: ProductMapper,
    private readonly productService: ProductService,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  async create(
    createWarehouseOpeningDto: CreateWarehouseOpeningDto,
    userId?: string,
  ): Promise<WarehouseOpeningResponseDto> {
    try {
      const warehouseOpening = this.warehouseOpeningRepository.create({
        ...createWarehouseOpeningDto,
        organization_id: this.organizationId,
      });
      const saved =
        await this.warehouseOpeningRepository.save(warehouseOpening);

      const savedWithRelations = await this.warehouseOpeningRepository.findOne({
        where: { id: saved.id, organization_id: this.organizationId },
        relations: [
          'warehouse',
          'product',
          'product.brand',
          'product.category',
          'product.taxes',
          'product.measurement_unit',
          'product.prices',
        ],
      });

      if (!savedWithRelations) {
        const message = await this.translationService.translate(
          'warehouse_opening.not_found',
          userId,
        );
        throw new NotFoundException(message);
      }


      await this.productService.updateStock(
        createWarehouseOpeningDto.productId,
        Number(createWarehouseOpeningDto.quantity),
      );

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
        where: { warehouseId, organization_id: this.organizationId },
        relations: [
          'warehouse',
          'product',
          'product.brand',
          'product.category',
          'product.taxes',
          'product.measurement_unit',
          'product.prices',
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
      where: { id, organization_id: this.organizationId },
      relations: [
        'warehouse',
        'product',
        'product.brand',
        'product.category',
        'product.taxes',
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
      where: { id, organization_id: this.organizationId },
      relations: [
        'warehouse',
        'product',
        'product.brand',
        'product.category',
        'product.taxes',
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

      const updatedWithRelations =
        await this.warehouseOpeningRepository.findOne({
          where: { id: updated.id, organization_id: this.organizationId },
          relations: [
            'warehouse',
            'product',
            'product.brand',
            'product.category',
            'product.taxes',
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
      where: { id, organization_id: this.organizationId },
    });

    if (!warehouseOpening) {
      const message = await this.translationService.translate(
        'warehouse_opening.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.warehouseOpeningRepository.softDelete({
      id,
      organization_id: this.organizationId,
    });
  }

  private mapToResponseDto(
    warehouseOpening: WarehouseOpening,
  ): WarehouseOpeningResponseDto {
    return {
      id: warehouseOpening.id,
      warehouseId: warehouseOpening.warehouseId,
      product: this.productMapper.mapToResponseDto(warehouseOpening.product),
      quantity: warehouseOpening.quantity,
      price: warehouseOpening.price,
      createdAt: warehouseOpening.createdAt,
    };
  }
}
