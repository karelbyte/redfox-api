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

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly taxMapper: TaxMapper,
  ) {}

  async create(createTaxDto: CreateTaxDto): Promise<TaxResponseDto> {
    const tax = this.taxRepository.create(createTaxDto);
    const savedTax = await this.taxRepository.save(tax);
    return this.taxMapper.mapToResponseDto(savedTax);
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

  async findOne(id: string): Promise<TaxResponseDto> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
    }
    return this.taxMapper.mapToResponseDto(tax);
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
    return this.taxMapper.mapToResponseDto(savedTax);
  }

  async remove(id: string): Promise<void> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
    }

    // Verificar si el tax está siendo usado en productos
    const productsUsingTax = await this.productRepository.count({
      where: { tax: { id } },
      withDeleted: false,
    });

    if (productsUsingTax > 0) {
      throw new BadRequestException(
        `No se puede eliminar el impuesto '${tax.name}' porque está siendo usado por ${productsUsingTax} producto(s). Primero debe cambiar o eliminar los productos que usan este impuesto.`,
      );
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
    return this.taxMapper.mapToResponseDto(savedTax);
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
    return this.taxMapper.mapToResponseDto(savedTax);
  }

  async getTaxUsage(
    id: string,
  ): Promise<{ tax: TaxResponseDto; productsCount: number; products: any[] }> {
    const tax = await this.taxRepository.findOne({
      where: { id, isActive: true },
    });
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
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
