import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { CreateMeasurementUnitDto } from '../dtos/measurement-unit/create-measurement-unit.dto';
import { UpdateMeasurementUnitDto } from '../dtos/measurement-unit/update-measurement-unit.dto';
import { MeasurementUnitResponseDto } from '../dtos/measurement-unit/measurement-unit-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class MeasurementUnitService {
  constructor(
    @InjectRepository(MeasurementUnit)
    private measurementUnitRepository: Repository<MeasurementUnit>,
  ) {}

  private mapToResponseDto(measurementUnit: MeasurementUnit): MeasurementUnitResponseDto {
    const { id, code, description, status, created_at } = measurementUnit;
    return { id, code, description, status, created_at };
  }

  async create(createMeasurementUnitDto: CreateMeasurementUnitDto): Promise<MeasurementUnitResponseDto> {
    const measurementUnit = this.measurementUnitRepository.create(createMeasurementUnitDto);
    const savedMeasurementUnit = await this.measurementUnitRepository.save(measurementUnit);
    return this.mapToResponseDto(savedMeasurementUnit);
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponse<MeasurementUnitResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [measurementUnits, total] = await this.measurementUnitRepository.findAndCount({
      withDeleted: false,
      skip,
      take: limit,
    });

    const data = measurementUnits.map((unit) => this.mapToResponseDto(unit));

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
    return this.mapToResponseDto(measurementUnit);
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
    const updatedMeasurementUnit = await this.measurementUnitRepository.save({
      ...measurementUnit,
      ...updateMeasurementUnitDto,
    });
    return this.mapToResponseDto(updatedMeasurementUnit);
  }

  async remove(id: string): Promise<void> {
    const measurementUnit = await this.measurementUnitRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!measurementUnit) {
      throw new NotFoundException(`Measurement unit with ID ${id} not found`);
    }
    await this.measurementUnitRepository.softRemove(measurementUnit);
  }
} 