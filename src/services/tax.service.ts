import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from '../models/tax.entity';
import { CreateTaxDto } from '../dtos/tax/create-tax.dto';
import { UpdateTaxDto } from '../dtos/tax/update-tax.dto';
import { TaxResponseDto } from '../dtos/tax/tax-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
  ) {}

  async create(createTaxDto: CreateTaxDto): Promise<TaxResponseDto> {
    const tax = this.taxRepository.create(createTaxDto);
    const savedTax = await this.taxRepository.save(tax);
    return this.mapToResponseDto(savedTax);
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponse<TaxResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [taxes, total] = await this.taxRepository.findAndCount({
      where: { isActive: true },
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    const data = taxes.map((tax) => this.mapToResponseDto(tax));

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

  async findOne(id: string): Promise<TaxResponseDto> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
    }
    return this.mapToResponseDto(tax);
  }

  async update(
    id: string,
    updateTaxDto: UpdateTaxDto,
  ): Promise<TaxResponseDto> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
    }

    const dtax = { ...tax, ...updateTaxDto };
    const savedTax = await this.taxRepository.save(dtax);
    return this.mapToResponseDto(savedTax);
  }

  async remove(id: string): Promise<void> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
    }
    await this.taxRepository.softDelete(id);
  }

  async activate(id: string): Promise<TaxResponseDto> {
    const tax = await this.taxRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
    }

    tax.isActive = true;
    const savedTax = await this.taxRepository.save(tax);
    return this.mapToResponseDto(savedTax);
  }

  async deactivate(id: string): Promise<TaxResponseDto> {
    const tax = await this.taxRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
    }

    tax.isActive = false;
    const savedTax = await this.taxRepository.save(tax);
    return this.mapToResponseDto(savedTax);
  }

  private mapToResponseDto(tax: Tax): TaxResponseDto {
    const { id, code, name, value, type, isActive, createdAt } = tax;
    return {
      id,
      code,
      name,
      value,
      type,
      isActive,
      createdAt,
    };
  }
}
