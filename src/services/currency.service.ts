import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Currency } from '../models/currency.entity';
import { CreateCurrencyDto } from '../dtos/currency/create-currency.dto';
import { UpdateCurrencyDto } from '../dtos/currency/update-currency.dto';
import { CurrencyResponseDto } from '../dtos/currency/currency-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { CurrencyMapper } from './mappers/currency.mapper';
import { TranslationService } from './translation.service';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    private readonly currencyMapper: CurrencyMapper,
    private translationService: TranslationService,
  ) {}

  async create(
    createCurrencyDto: CreateCurrencyDto,
    userId?: string,
  ): Promise<CurrencyResponseDto> {
    try {
      // Verificar si ya existe una moneda con el mismo código
      const existingCurrency = await this.currencyRepository.findOne({
        where: { code: createCurrencyDto.code.toUpperCase() },
      });

      if (existingCurrency) {
        const message = await this.translationService.translate(
          'currency.already_exists',
          userId,
          { code: createCurrencyDto.code },
        );
        throw new ConflictException(message);
      }

      const currency = this.currencyRepository.create({
        ...createCurrencyDto,
        code: createCurrencyDto.code.toUpperCase(),
      });

      const saved = await this.currencyRepository.save(currency);
      return this.currencyMapper.mapToResponseDto(saved);
    } catch (error: unknown) {
      // Handle duplicate code error
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('currencies.UQ_')
      ) {
        const message = await this.translationService.translate(
          'currency.already_exists',
          userId,
          { code: createCurrencyDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<CurrencyResponseDto>> {
    const { page, limit, term } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = {
      where: {},
      order: {
        name: 'ASC' as const,
      },
    };
    const whereConditions: FindManyOptions<Currency> = term
      ? {
          ...baseConditions,
          where: [{ code: Like(`%${term}%`) }, { name: Like(`%${term}%`) }],
        }
      : baseConditions;

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const currencies = await this.currencyRepository.find(whereConditions);

      const data = currencies.map((currency) =>
        this.currencyMapper.mapToResponseDto(currency),
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

    const [currencies, total] = await this.currencyRepository.findAndCount({
      ...whereConditions,
      skip,
      take: currentLimit,
    });

    const data = currencies.map((currency) =>
      this.currencyMapper.mapToResponseDto(currency),
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

  async findOne(id: string, userId?: string): Promise<CurrencyResponseDto> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      const message = await this.translationService.translate(
        'currency.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.currencyMapper.mapToResponseDto(currency);
  }

  async findByCode(
    code: string,
    userId?: string,
  ): Promise<CurrencyResponseDto> {
    const currency = await this.currencyRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!currency) {
      const message = await this.translationService.translate(
        'currency.code_not_found',
        userId,
        { code },
      );
      throw new NotFoundException(message);
    }

    return this.currencyMapper.mapToResponseDto(currency);
  }

  async update(
    id: string,
    updateCurrencyDto: UpdateCurrencyDto,
    userId?: string,
  ): Promise<CurrencyResponseDto> {
    try {
      const currency = await this.currencyRepository.findOne({
        where: { id },
      });

      if (!currency) {
        const message = await this.translationService.translate(
          'currency.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      // Si se está actualizando el código, verificar que no exista
      if (
        updateCurrencyDto.code &&
        updateCurrencyDto.code.toUpperCase() !== currency.code
      ) {
        const existingCurrency = await this.currencyRepository.findOne({
          where: { code: updateCurrencyDto.code.toUpperCase() },
        });

        if (existingCurrency) {
          const message = await this.translationService.translate(
            'currency.already_exists',
            userId,
            { code: updateCurrencyDto.code },
          );
          throw new ConflictException(message);
        }
      }

      const updatedData = {
        ...updateCurrencyDto,
        ...(updateCurrencyDto.code && {
          code: updateCurrencyDto.code.toUpperCase(),
        }),
      };

      const updated = await this.currencyRepository.save({
        ...currency,
        ...updatedData,
      });

      return this.currencyMapper.mapToResponseDto(updated);
    } catch (error: unknown) {
      // Handle duplicate code error in update
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('currencies.UQ_')
      ) {
        const message = await this.translationService.translate(
          'currency.already_exists',
          userId,
          { code: updateCurrencyDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      const message = await this.translationService.translate(
        'currency.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.currencyRepository.softDelete(id);
  }
}
