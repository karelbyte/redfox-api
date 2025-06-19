import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
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

  async create(createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    const brand = this.brandRepository.create(createBrandDto);
    const savedBrand = await this.brandRepository.save(brand);
    return this.mapToResponseDto(savedBrand);
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<BrandResponseDto>> {
    console.log(paginationDto);
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
    const { page = 1, limit = 10 } = paginationDto;
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

  async findOne(id: string): Promise<BrandResponseDto> {
    const brand = await this.brandRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return this.mapToResponseDto(brand);
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    const brand = await this.brandRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    const updatedBrand = await this.brandRepository.save({
      ...brand,
      ...updateBrandDto,
    });
    return this.mapToResponseDto(updatedBrand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    // Verificar si el brand está siendo usado en productos
    const productsUsingBrand = await this.productRepository.count({
      where: { brand: { id } },
      withDeleted: false,
    });

    if (productsUsingBrand > 0) {
      throw new BadRequestException(
        `No se puede eliminar la marca '${brand.description}' porque está siendo usada por ${productsUsingBrand} producto(s). Primero debe cambiar o eliminar los productos que usan esta marca.`,
      );
    }

    await this.brandRepository.softRemove(brand);
  }

  async getBrandUsage(id: string): Promise<{
    brand: BrandResponseDto;
    productsCount: number;
    products: any[];
  }> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
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
