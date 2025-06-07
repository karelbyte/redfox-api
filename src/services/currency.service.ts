import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from '../models/currency.entity';
import { CreateCurrencyDto } from '../dtos/currency/create-currency.dto';
import { UpdateCurrencyDto } from '../dtos/currency/update-currency.dto';
import { CurrencyResponseDto } from '../dtos/currency/currency-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  async create(createCurrencyDto: CreateCurrencyDto): Promise<CurrencyResponseDto> {
    // Verificar si ya existe una moneda con el mismo código
    const existingCurrency = await this.currencyRepository.findOne({
      where: { code: createCurrencyDto.code.toUpperCase() },
    });

    if (existingCurrency) {
      throw new ConflictException(`Currency with code ${createCurrencyDto.code} already exists`);
    }

    const currency = this.currencyRepository.create({
      ...createCurrencyDto,
      code: createCurrencyDto.code.toUpperCase(),
    });

    const saved = await this.currencyRepository.save(currency);
    return this.mapToResponseDto(saved);
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponse<CurrencyResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [currencies, total] = await this.currencyRepository.findAndCount({
      skip,
      take: limit,
      order: { name: 'ASC' },
    });

    const data = currencies.map((currency) => this.mapToResponseDto(currency));

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

  async findOne(id: string): Promise<CurrencyResponseDto> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    return this.mapToResponseDto(currency);
  }

  async findByCode(code: string): Promise<CurrencyResponseDto> {
    const currency = await this.currencyRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException(`Currency with code ${code} not found`);
    }

    return this.mapToResponseDto(currency);
  }

  async update(id: string, updateCurrencyDto: UpdateCurrencyDto): Promise<CurrencyResponseDto> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    // Si se está actualizando el código, verificar que no exista
    if (updateCurrencyDto.code && updateCurrencyDto.code.toUpperCase() !== currency.code) {
      const existingCurrency = await this.currencyRepository.findOne({
        where: { code: updateCurrencyDto.code.toUpperCase() },
      });

      if (existingCurrency) {
        throw new ConflictException(`Currency with code ${updateCurrencyDto.code} already exists`);
      }
    }

    const updatedData = {
      ...updateCurrencyDto,
      ...(updateCurrencyDto.code && { code: updateCurrencyDto.code.toUpperCase() }),
    };

    const updated = await this.currencyRepository.save({
      ...currency,
      ...updatedData,
    });

    return this.mapToResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    await this.currencyRepository.softDelete(id);
  }

  private mapToResponseDto(currency: Currency): CurrencyResponseDto {
    return {
      id: currency.id,
      code: currency.code,
      name: currency.name,
      createdAt: currency.createdAt,
      updatedAt: currency.updatedAt,
    };
  }
} 