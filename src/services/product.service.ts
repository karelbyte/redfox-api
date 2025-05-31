import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from '../models/product.entity';
import { CreateProductDto } from '../dtos/product/create-product.dto';
import { UpdateProductDto } from '../dtos/product/update-product.dto';
import { ProductResponseDto } from '../dtos/product/product-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { MeasurementUnitMapper } from './mappers/measurement-unit.mapper';
import { BrandMapper } from './mappers/brand.mapper';
import { CategoryMapper } from './mappers/category.mapper';
import { TaxMapper } from './mappers/tax.mapper';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly measurementUnitMapper: MeasurementUnitMapper,
    private readonly brandMapper: BrandMapper,
    private readonly categoryMapper: CategoryMapper,
    private readonly taxMapper: TaxMapper,
  ) {}

  mapToResponseDto(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      weight: product.weight,
      width: product.width,
      height: product.height,
      length: product.length,
      brand: this.brandMapper.mapToResponseDto(product.brand),
      category: this.categoryMapper.mapToResponseDto(product.category),
      tax: this.taxMapper.mapToResponseDto(product.tax),
      measurement_unit: this.measurementUnitMapper.mapToResponseDto(
        product.measurement_unit,
      ),
      is_active: product.is_active,
      type: product.type,
      images: product.images ? JSON.parse(product.images) : [],
      created_at: product.created_at,
    };
  }

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const [existingSlug, existingSku] = await Promise.all([
      this.productRepository.findOne({
        where: { slug: createProductDto.slug },
      }),
      this.productRepository.findOne({
        where: { sku: createProductDto.sku },
      }),
    ]);

    if (existingSlug) {
      throw new ConflictException(
        `El slug '${createProductDto.slug}' ya está en uso`,
      );
    }

    if (existingSku) {
      throw new ConflictException(
        `El SKU '${createProductDto.sku}' ya está en uso`,
      );
    }

    const product = this.productRepository.create({
      name: createProductDto.name,
      slug: createProductDto.slug,
      description: createProductDto.description,
      sku: createProductDto.sku,
      weight: createProductDto.weight ?? 0,
      width: createProductDto.width ?? 0,
      height: createProductDto.height ?? 0,
      length: createProductDto.length ?? 0,
      brand: createProductDto.brand_id
        ? { id: createProductDto.brand_id }
        : undefined,
      category: createProductDto.category_id
        ? { id: createProductDto.category_id }
        : undefined,
      tax: createProductDto.tax_id
        ? { id: createProductDto.tax_id }
        : undefined,
      measurement_unit: { id: createProductDto.measurement_unit_id },
      is_active: createProductDto.is_active ?? true,
      type: createProductDto.type ?? ProductType.TANGIBLE,
      images: createProductDto.images
        ? JSON.stringify(createProductDto.images)
        : undefined,
    });

    const savedProduct = await this.productRepository.save(product);
    return this.mapToResponseDto(savedProduct);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
      skip,
      take: limit,
    });

    return {
      data: products.map((product) => this.mapToResponseDto(product)),
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
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapToResponseDto(product);
  }

  async findOneEntity(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.findOneEntity(id);

    const updatedProduct = this.productRepository.merge(product, {
      name: updateProductDto.name,
      slug: updateProductDto.slug,
      description: updateProductDto.description,
      sku: updateProductDto.sku,
      weight: updateProductDto.weight,
      width: updateProductDto.width,
      height: updateProductDto.height,
      length: updateProductDto.length,
      brand: updateProductDto.brand_id
        ? { id: updateProductDto.brand_id }
        : undefined,
      category: updateProductDto.category_id
        ? { id: updateProductDto.category_id }
        : undefined,
      tax: updateProductDto.tax_id
        ? { id: updateProductDto.tax_id }
        : undefined,
      measurement_unit: updateProductDto.measurement_unit_id
        ? { id: updateProductDto.measurement_unit_id }
        : undefined,
      is_active: updateProductDto.is_active,
      type: updateProductDto.type,
      images: updateProductDto.images
        ? JSON.stringify(updateProductDto.images)
        : undefined,
    });

    const savedProduct = await this.productRepository.save(updatedProduct);
    return this.mapToResponseDto(savedProduct);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOneEntity(id);
    await this.productRepository.softRemove(product);
  }
}
