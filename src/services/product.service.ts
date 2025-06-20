import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product, ProductType } from '../models/product.entity';
import { Inventory } from '../models/inventory.entity';
import { WarehouseOpening } from '../models/warehouse-opening.entity';
import { CreateProductDto } from '../dtos/product/create-product.dto';
import { UpdateProductDto } from '../dtos/product/update-product.dto';
import { ProductResponseDto } from '../dtos/product/product-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { ProductMapper } from './mappers/product.mapper';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(WarehouseOpening)
    private readonly warehouseOpeningRepository: Repository<WarehouseOpening>,
    private readonly productMapper: ProductMapper,
  ) {}

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
    return this.productMapper.mapToResponseDto(savedProduct);
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const { page, limit, term } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = {
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
    };
    const whereConditions = term
      ? {
          ...baseConditions,
          where: [
            { name: Like(`%${term}%`) },
            { slug: Like(`%${term}%`) },
            { description: Like(`%${term}%`) },
            { sku: Like(`%${term}%`) },
          ],
        }
      : baseConditions;

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const products = await this.productRepository.find(whereConditions);

      const data = products.map((product) =>
        this.productMapper.mapToResponseDto(product),
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

    const [products, total] = await this.productRepository.findAndCount({
      ...whereConditions,
      skip,
      take: currentLimit,
    });

    const data = products.map((product) =>
      this.productMapper.mapToResponseDto(product),
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

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.productMapper.mapToResponseDto(product);
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
    return this.productMapper.mapToResponseDto(savedProduct);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOneEntity(id);

    // Verificar si el producto está siendo usado en inventory
    const inventoryCount = await this.inventoryRepository.count({
      where: { product_id: id },
      withDeleted: false,
    });

    // Verificar si el producto está siendo usado en warehouse openings
    const warehouseOpeningCount = await this.warehouseOpeningRepository.count({
      where: { productId: id },
      withDeleted: false,
    });

    if (inventoryCount > 0 || warehouseOpeningCount > 0) {
      const messages: string[] = [];
      if (inventoryCount > 0) {
        messages.push(`está en inventario (${inventoryCount} registro(s))`);
      }
      if (warehouseOpeningCount > 0) {
        messages.push(
          `está en apertura de almacén (${warehouseOpeningCount} registro(s))`,
        );
      }

      throw new BadRequestException(
        `No se puede eliminar el producto '${product.name}' porque ${messages.join(' y ')}. Primero debe eliminar estos registros.`,
      );
    }

    await this.productRepository.softRemove(product);
  }

  async getProductUsage(id: string): Promise<{
    product: ProductResponseDto;
    inventoryCount: number;
    warehouseOpeningCount: number;
    inventory: any[];
    warehouseOpenings: any[];
  }> {
    const product = await this.findOneEntity(id);

    const inventory = await this.inventoryRepository.find({
      where: { product: { id } },
      select: ['id', 'quantity', 'price'],
      relations: ['warehouse'],
      withDeleted: false,
    });

    const warehouseOpenings = await this.warehouseOpeningRepository.find({
      where: { product: { id } },
      select: ['id', 'quantity', 'price'],
      relations: ['warehouse'],
      withDeleted: false,
    });

    return {
      product: this.productMapper.mapToResponseDto(product),
      inventoryCount: inventory.length,
      warehouseOpeningCount: warehouseOpenings.length,
      inventory: inventory.map((inv) => ({
        id: inv.id,
        quantity: inv.quantity,
        price: inv.price,
        warehouse: inv.warehouse
          ? { id: inv.warehouse.id, name: inv.warehouse.name }
          : null,
      })),
      warehouseOpenings: warehouseOpenings.map((wo) => ({
        id: wo.id,
        quantity: wo.quantity,
        price: wo.price,
        warehouse: wo.warehouse
          ? { id: wo.warehouse.id, name: wo.warehouse.name }
          : null,
      })),
    };
  }
}
