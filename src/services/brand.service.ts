import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../models/brand.entity';
import { Product } from '../models/product.entity';
import { CreateBrandDto } from '../dtos/brand/create-brand.dto';
import { UpdateBrandDto } from '../dtos/brand/update-brand.dto';
import { BrandResponseDto } from '../dtos/brand/brand-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TranslationService } from './translation.service';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private translationService: TranslationService,
  ) {}

  private mapToResponseDto(brand: Brand): BrandResponseDto {
    const { id, code, description, img, isActive, created_at } = brand;
    return {
      id,
      code,
      description,
      img,
      isActive,
      created_at,
    };
  }

  async create(
    createBrandDto: CreateBrandDto,
    userId?: string,
  ): Promise<BrandResponseDto> {
    try {
      const brand = this.brandRepository.create(createBrandDto);
      const savedBrand = await this.brandRepository.save(brand);
      return this.mapToResponseDto(savedBrand);
    } catch (error) {
      // Manejar error de código duplicado
      if (
        error.code === 'ER_DUP_ENTRY' &&
        error.message.includes('brands.UQ_')
      ) {
        const message = await this.translationService.translate(
          'brand.already_exists',
          userId,
          { code: createBrandDto.code },
        );
        throw new ConflictException(message);
      }

      // Re-lanzar otros errores
      throw error;
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<BrandResponseDto>> {
    // Si no hay parámetros de paginación, traer todos los registros
    if (!paginationDto || (!paginationDto.page && !paginationDto.limit)) {
      const brands = await this.brandRepository.find({
        withDeleted: false,
      });

      const data = brands.map((brand) => this.mapToResponseDto(brand));

      return {
        data,
        meta: {
          total: brands.length,
          page: 1,
          limit: brands.length,
          totalPages: 1,
        },
      };
    }

    // Si hay parámetros de paginación, paginar normalmente
    const { page = 1, limit = 8 } = paginationDto;
    const skip = (page - 1) * limit;

    const [brands, total] = await this.brandRepository.findAndCount({
      withDeleted: false,
      skip,
      take: limit,
    });

    const data = brands.map((brand) => this.mapToResponseDto(brand));

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

  async findOne(id: string, userId?: string): Promise<BrandResponseDto> {
    const brand = await this.brandRepository.findOne({
      where: { id },
      withDeleted: false,
    });

    if (!brand) {
      const message = await this.translationService.translate(
        'brand.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(brand);
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
    userId?: string,
  ): Promise<BrandResponseDto> {
    try {
      const brand = await this.brandRepository.findOne({
        where: { id },
        withDeleted: false,
      });

      if (!brand) {
        const message = await this.translationService.translate(
          'brand.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      const updatedBrand = await this.brandRepository.save({
        ...brand,
        ...updateBrandDto,
      });
      return this.mapToResponseDto(updatedBrand);
    } catch (error) {
      // Manejar error de código duplicado en actualización
      if (
        error.code === 'ER_DUP_ENTRY' &&
        error.message.includes('brands.UQ_')
      ) {
        const message = await this.translationService.translate(
          'brand.already_exists',
          userId,
          { code: updateBrandDto.code },
        );
        throw new ConflictException(message);
      }

      // Re-lanzar otros errores
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      const message = await this.translationService.translate(
        'brand.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    // Verificar si el brand está siendo usado en productos
    const productsUsingBrand = await this.productRepository.count({
      where: { brand: { id } },
      withDeleted: false,
    });

    if (productsUsingBrand > 0) {
      const message = await this.translationService.translate(
        'brand.cannot_delete_in_use',
        userId,
        {
          description: brand.description,
          count: productsUsingBrand,
        },
      );
      throw new BadRequestException(message);
    }

    await this.brandRepository.softRemove(brand);
  }

  async getBrandUsage(
    id: string,
    userId?: string,
  ): Promise<{
    brand: BrandResponseDto;
    productsCount: number;
    products: any[];
  }> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      const message = await this.translationService.translate(
        'brand.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    const products = await this.productRepository.find({
      where: { brand: { id } },
      select: ['id', 'name', 'sku'],
      withDeleted: false,
    });

    return {
      brand: this.mapToResponseDto(brand),
      productsCount: products.length,
      products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
    };
  }
}
