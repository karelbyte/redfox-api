import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { Product } from '../models/product.entity';
import { CreateMeasurementUnitDto } from '../dtos/measurement-unit/create-measurement-unit.dto';
import { UpdateMeasurementUnitDto } from '../dtos/measurement-unit/update-measurement-unit.dto';
import { MeasurementUnitResponseDto } from '../dtos/measurement-unit/measurement-unit-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { MeasurementUnitMapper } from './mappers/measurement-unit.mapper';
import { TranslationService } from './translation.service';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { MeasurementUnitSuggestion } from '../interfaces/certification-pack.interface';

@Injectable()
export class MeasurementUnitService {
  constructor(
    @InjectRepository(MeasurementUnit)
    private measurementUnitRepository: Repository<MeasurementUnit>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly measurementUnitMapper: MeasurementUnitMapper,
    private translationService: TranslationService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  async create(
    createMeasurementUnitDto: CreateMeasurementUnitDto,
    userId?: string,
  ): Promise<MeasurementUnitResponseDto> {
    try {
      const existingUnit = await this.measurementUnitRepository.findOne({
        where: { code: createMeasurementUnitDto.code },
        withDeleted: false,
      });

      if (existingUnit) {
        const message = await this.translationService.translate(
          'measurement_unit.already_exists',
          userId,
          { code: createMeasurementUnitDto.code },
        );
        throw new BadRequestException(message);
      }

      const measurementUnit = this.measurementUnitRepository.create(
        createMeasurementUnitDto,
      );
      const savedMeasurementUnit =
        await this.measurementUnitRepository.save(measurementUnit);
      return this.measurementUnitMapper.mapToResponseDto(savedMeasurementUnit);
    } catch (error: any) {
      // Handle duplicate code error
      if (
        error?.code === 'ER_DUP_ENTRY' &&
        error?.message?.includes('measurement_units.UQ_')
      ) {
        const message = await this.translationService.translate(
          'measurement_unit.already_exists',
          userId,
          { code: createMeasurementUnitDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<MeasurementUnitResponseDto>> {
    const { page, limit, term } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = { withDeleted: false };
    const whereConditions = term
      ? {
          ...baseConditions,
          where: [
            { code: Like(`%${term}%`) },
            { description: Like(`%${term}%`) },
          ],
        }
      : baseConditions;

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const measurementUnits =
        await this.measurementUnitRepository.find(whereConditions);

      const data = measurementUnits.map((unit) =>
        this.measurementUnitMapper.mapToResponseDto(unit),
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
    const currentLimit = limit || 8;
    const skip = (currentPage - 1) * currentLimit;

    const [measurementUnits, total] =
      await this.measurementUnitRepository.findAndCount({
        ...whereConditions,
        skip,
        take: currentLimit,
      });

    const data = measurementUnits.map((unit) =>
      this.measurementUnitMapper.mapToResponseDto(unit),
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

  async findOne(
    id: string,
    userId?: string,
  ): Promise<MeasurementUnitResponseDto> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!measurementUnit) {
      const message = await this.translationService.translate(
        'measurement_unit.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.measurementUnitMapper.mapToResponseDto(measurementUnit);
  }

  async update(
    id: string,
    updateMeasurementUnitDto: UpdateMeasurementUnitDto,
    userId?: string,
  ): Promise<MeasurementUnitResponseDto> {
    try {
      const measurementUnit = await this.measurementUnitRepository.findOne({
        where: { id },
        withDeleted: false,
      });
      if (!measurementUnit) {
        const message = await this.translationService.translate(
          'measurement_unit.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      if (
        updateMeasurementUnitDto.code &&
        updateMeasurementUnitDto.code !== measurementUnit.code
      ) {
        const existingUnit = await this.measurementUnitRepository.findOne({
          where: { code: updateMeasurementUnitDto.code },
          withDeleted: false,
        });

        if (existingUnit) {
          const message = await this.translationService.translate(
            'measurement_unit.already_exists',
            userId,
            { code: updateMeasurementUnitDto.code },
          );
          throw new BadRequestException(message);
        }
      }

      const updatedMeasurementUnit = await this.measurementUnitRepository.save({
        ...measurementUnit,
        ...updateMeasurementUnitDto,
      });
      return this.measurementUnitMapper.mapToResponseDto(updatedMeasurementUnit);
    } catch (error: any) {
      // Handle duplicate code error in update
      if (
        error?.code === 'ER_DUP_ENTRY' &&
        error?.message?.includes('measurement_units.UQ_')
      ) {
        const message = await this.translationService.translate(
          'measurement_unit.already_exists',
          userId,
          { code: updateMeasurementUnitDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!measurementUnit) {
      const message = await this.translationService.translate(
        'measurement_unit.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    // Verificar si la unidad de medida está siendo usada en productos
    const productsUsingUnit = await this.productRepository.count({
      where: { measurement_unit: { id } },
      withDeleted: false,
    });

    if (productsUsingUnit > 0) {
      const message = await this.translationService.translate(
        'measurement_unit.cannot_delete_in_use',
        userId,
        {
          description: measurementUnit.description,
          count: productsUsingUnit,
        },
      );
      throw new BadRequestException(message);
    }

    await this.measurementUnitRepository.softRemove(measurementUnit);
  }

  async getMeasurementUnitUsage(
    id: string,
    userId?: string,
  ): Promise<{
    measurementUnit: MeasurementUnitResponseDto;
    productsCount: number;
    products: any[];
  }> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!measurementUnit) {
      const message = await this.translationService.translate(
        'measurement_unit.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    const products = await this.productRepository.find({
      where: { measurement_unit: { id } },
      select: ['id', 'name', 'sku'],
      withDeleted: false,
    });

    return {
      measurementUnit:
        this.measurementUnitMapper.mapToResponseDto(measurementUnit),
      productsCount: products.length,
      products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
    };
  }

  async searchFromPack(term: string): Promise<MeasurementUnitSuggestion[]> {
    try {
      const packService = await this.certificationPackFactory.getPackService();
      return await packService.searchMeasurementUnits(term);
    } catch (error) {
      return [];
    }
  }
}
