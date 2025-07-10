import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Tax } from '../models/tax.entity';
import { Product } from '../models/product.entity';
import { CreateTaxDto } from '../dtos/tax/create-tax.dto';
import { UpdateTaxDto } from '../dtos/tax/update-tax.dto';
import { TaxResponseDto } from '../dtos/tax/tax-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TaxMapper } from './mappers/tax.mapper';
import { TranslationService } from './translation.service';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly taxMapper: TaxMapper,
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createTaxDto: CreateTaxDto,
    userId?: string,
  ): Promise<TaxResponseDto> {
    try {
      const tax = this.taxRepository.create(createTaxDto);
      const savedTax = await this.taxRepository.save(tax);
      return this.taxMapper.mapToResponseDto(savedTax);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('taxes.UQ_')
      ) {
        const message = await this.translationService.translate(
          'tax.already_exists',
          userId,
          { code: createTaxDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<TaxResponseDto>> {
    const { page, limit, term } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = {
      where: {},
      order: {
        createdAt: 'DESC' as const,
      },
    };
    const whereConditions: FindManyOptions<Tax> = term
      ? {
          ...baseConditions,
          where: [{ code: Like(`%${term}%`) }, { name: Like(`%${term}%`) }],
        }
      : baseConditions;

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const taxes = await this.taxRepository.find(whereConditions);

      const data = taxes.map((tax) => this.taxMapper.mapToResponseDto(tax));

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

    const [taxes, total] = await this.taxRepository.findAndCount({
      ...whereConditions,
      skip,
      take: currentLimit,
    });

    const data = taxes.map((tax) => this.taxMapper.mapToResponseDto(tax));

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

  async findOne(id: string, userId?: string): Promise<TaxResponseDto> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      const message = await this.translationService.translate(
        'tax.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.taxMapper.mapToResponseDto(tax);
  }

  async update(
    id: string,
    updateTaxDto: UpdateTaxDto,
    userId?: string,
  ): Promise<TaxResponseDto> {
    try {
      const tax = await this.taxRepository.findOne({
        where: { id, isActive: true },
      });
      if (!tax) {
        const message = await this.translationService.translate(
          'tax.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      const dtax = { ...tax, ...updateTaxDto };
      const savedTax = await this.taxRepository.save(dtax);
      return this.taxMapper.mapToResponseDto(savedTax);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('taxes.UQ_')
      ) {
        const message = await this.translationService.translate(
          'tax.already_exists',
          userId,
          { code: updateTaxDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      const message = await this.translationService.translate(
        'tax.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    // Verificar si el tax está siendo usado en productos
    const productsUsingTax = await this.productRepository.count({
      where: { tax: { id } },
      withDeleted: false,
    });

    if (productsUsingTax > 0) {
      const message = await this.translationService.translate(
        'tax.cannot_delete_in_use',
        userId,
        {
          name: tax.name,
          count: productsUsingTax,
        },
      );
      throw new BadRequestException(message);
    }

    await this.taxRepository.softDelete(id);
  }

  async activate(id: string, userId?: string): Promise<TaxResponseDto> {
    const tax = await this.taxRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!tax) {
      const message = await this.translationService.translate(
        'tax.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    tax.isActive = true;
    const savedTax = await this.taxRepository.save(tax);
    return this.taxMapper.mapToResponseDto(savedTax);
  }

  async deactivate(id: string, userId?: string): Promise<TaxResponseDto> {
    const tax = await this.taxRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!tax) {
      const message = await this.translationService.translate(
        'tax.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    tax.isActive = false;
    const savedTax = await this.taxRepository.save(tax);
    return this.taxMapper.mapToResponseDto(savedTax);
  }

  async getTaxUsage(
    id: string,
    userId?: string,
  ): Promise<{ tax: TaxResponseDto; productsCount: number; products: any[] }> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      const message = await this.translationService.translate(
        'tax.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    const products = await this.productRepository.find({
      where: { tax: { id } },
      select: ['id', 'name', 'sku'],
      withDeleted: false,
    });

    return {
      tax: this.taxMapper.mapToResponseDto(tax),
      productsCount: products.length,
      products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
    };
  }
}
