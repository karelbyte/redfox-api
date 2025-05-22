import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../models/product.entity';
import { CreateProductDto } from '../dtos/product/create-product.dto';
import { UpdateProductDto } from '../dtos/product/update-product.dto';
import { ProductResponseDto } from '../dtos/product/product-response.dto';
import { BrandService } from './brand.service';
import { ProviderService } from './provider.service';
import { MeasurementUnitService } from './measurement-unit.service';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private brandService: BrandService,
    private providerService: ProviderService,
    private measurementUnitService: MeasurementUnitService,
  ) {}

  private async mapToResponseDto(
    product: Product,
  ): Promise<ProductResponseDto> {
    const {
      id,
      code,
      description,
      price,
      stock,
      min_stock,
      brand,
      provider,
      measurement_unit,
      status,
      created_at,
    } = product;

    return {
      id,
      code,
      description,
      price,
      stock,
      min_stock,
      brand: brand ? await this.brandService.findOne(brand.id) : undefined,
      provider: provider
        ? await this.providerService.findOne(provider.id)
        : undefined,
      measurement_unit: await this.measurementUnitService.findOne(
        measurement_unit.id,
      ),
      status,
      created_at,
    };
  }

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = this.productRepository.create(createProductDto);
    const savedProduct = await this.productRepository.save(product);
    return this.mapToResponseDto(savedProduct);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      relations: ['brand', 'provider', 'measurement_unit'],
      withDeleted: false,
      skip,
      take: limit,
    });

    const data = await Promise.all(
      products.map((product) => this.mapToResponseDto(product)),
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

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['brand', 'provider', 'measurement_unit'],
      withDeleted: false,
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.mapToResponseDto(product);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['brand', 'provider', 'measurement_unit'],
      withDeleted: false,
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    const updatedProduct = await this.productRepository.save({
      ...product,
      ...updateProductDto,
    });
    return this.mapToResponseDto(updatedProduct);
  }

  async remove(id: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.productRepository.softRemove(product);
  }
}
