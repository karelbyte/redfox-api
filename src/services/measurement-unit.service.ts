import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { Product } from '../models/product.entity';
import { CreateMeasurementUnitDto } from '../dtos/measurement-unit/create-measurement-unit.dto';
import { UpdateMeasurementUnitDto } from '../dtos/measurement-unit/update-measurement-unit.dto';
import { MeasurementUnitResponseDto } from '../dtos/measurement-unit/measurement-unit-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { MeasurementUnitMapper } from './mappers/measurement-unit.mapper';

@Injectable()
export class MeasurementUnitService {
  constructor(
    @InjectRepository(MeasurementUnit)
    private measurementUnitRepository: Repository<MeasurementUnit>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly measurementUnitMapper: MeasurementUnitMapper,
  ) {}

  async create(
    createMeasurementUnitDto: CreateMeasurementUnitDto,
  ): Promise<MeasurementUnitResponseDto> {
    const existingUnit = await this.measurementUnitRepository.findOne({
      where: { code: createMeasurementUnitDto.code },
      withDeleted: false,
    });

    if (existingUnit) {
      throw new BadRequestException(
        `Ya existe una unidad de medida con el código '${createMeasurementUnitDto.code}'`,
      );
    }

    const measurementUnit = this.measurementUnitRepository.create(
      createMeasurementUnitDto,
    );
    const savedMeasurementUnit =
      await this.measurementUnitRepository.save(measurementUnit);
    return this.measurementUnitMapper.mapToResponseDto(savedMeasurementUnit);
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<MeasurementUnitResponseDto>> {
    // Si no hay parámetros de paginación, traer todos los registros
    if (!paginationDto || (!paginationDto.page && !paginationDto.limit)) {
      const measurementUnits = await this.measurementUnitRepository.find({
        withDeleted: false,
      });

      const data = measurementUnits.map((unit) =>
        this.measurementUnitMapper.mapToResponseDto(unit),
      );

      return {
        data,
        meta: {
          total: measurementUnits.length,
          page: 1,
          limit: measurementUnits.length,
          totalPages: 1,
        },
      };
    }

    // Si hay parámetros de paginación, paginar normalmente
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [measurementUnits, total] =
      await this.measurementUnitRepository.findAndCount({
        withDeleted: false,
        skip,
        take: limit,
      });

    const data = measurementUnits.map((unit) =>
      this.measurementUnitMapper.mapToResponseDto(unit),
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

  async findOne(id: string): Promise<MeasurementUnitResponseDto> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!measurementUnit) {
      throw new NotFoundException(`Measurement unit with ID ${id} not found`);
    }
    return this.measurementUnitMapper.mapToResponseDto(measurementUnit);
  }

  async update(
    id: string,
    updateMeasurementUnitDto: UpdateMeasurementUnitDto,
  ): Promise<MeasurementUnitResponseDto> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!measurementUnit) {
      throw new NotFoundException(`Measurement unit with ID ${id} not found`);
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
        throw new BadRequestException(
          `Ya existe una unidad de medida con el código '${updateMeasurementUnitDto.code}'`,
        );
      }
    }

    const updatedMeasurementUnit = await this.measurementUnitRepository.save({
      ...measurementUnit,
      ...updateMeasurementUnitDto,
    });
    return this.measurementUnitMapper.mapToResponseDto(updatedMeasurementUnit);
  }

  async remove(id: string): Promise<void> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!measurementUnit) {
      throw new NotFoundException(`Measurement unit with ID ${id} not found`);
    }

    // Verificar si la unidad de medida está siendo usada en productos
    const productsUsingUnit = await this.productRepository.count({
      where: { measurement_unit: { id } },
      withDeleted: false,
    });

    if (productsUsingUnit > 0) {
      throw new BadRequestException(
        `No se puede eliminar la unidad de medida '${measurementUnit.description}' porque está siendo usada por ${productsUsingUnit} producto(s). Primero debe cambiar o eliminar los productos que usan esta unidad de medida.`,
      );
    }

    await this.measurementUnitRepository.softRemove(measurementUnit);
  }

  async getMeasurementUnitUsage(id: string): Promise<{
    measurementUnit: MeasurementUnitResponseDto;
    productsCount: number;
    products: any[];
  }> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!measurementUnit) {
      throw new NotFoundException(`Measurement unit with ID ${id} not found`);
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
}
