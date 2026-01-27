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
import { TranslationService } from './translation.service';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { ProductKeySuggestion } from '../interfaces/certification-pack.interface';

interface SearchCondition {
  name?: any;
  slug?: any;
  description?: any;
  code?: any;
  sku?: any;
  barcode?: any;
  is_active?: boolean;
  type?: ProductType;
}

interface FilterCondition {
  is_active?: boolean;
  type?: ProductType;
}

interface WhereConditions {
  relations: string[];
  where?: SearchCondition[] | FilterCondition;
}

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
    private translationService: TranslationService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    userId?: string,
  ): Promise<ProductResponseDto> {
    try {
      const [existingSlug, existingSku] = await Promise.all([
        this.productRepository.findOne({
          where: { slug: createProductDto.slug },
        }),
        this.productRepository.findOne({
          where: { sku: createProductDto.sku },
        }),
      ]);

      if (existingSlug) {
        const message = await this.translationService.translate(
          'product.slug_already_exists',
          userId,
          { slug: createProductDto.slug },
        );
        throw new ConflictException(message);
      }

      if (existingSku) {
        const message = await this.translationService.translate(
          'product.sku_already_exists',
          userId,
          { sku: createProductDto.sku },
        );
        throw new ConflictException(message);
      }

      const product = this.productRepository.create({
        name: createProductDto.name,
        slug: createProductDto.slug,
        description: createProductDto.description,
        sku: createProductDto.sku,
        code: createProductDto.code,
        barcode: createProductDto.barcode,
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
    } catch (error: unknown) {
      // Handle duplicate slug/SKU error
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('products.UQ_')
      ) {
        if (dbError?.message?.includes('slug')) {
          const message = await this.translationService.translate(
            'product.slug_already_exists',
            userId,
            { slug: createProductDto.slug },
          );
          throw new BadRequestException(message);
        } else if (dbError?.message?.includes('sku')) {
          const message = await this.translationService.translate(
            'product.sku_already_exists',
            userId,
            { sku: createProductDto.sku },
          );
          throw new BadRequestException(message);
        }
      }
      throw error;
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const { page, limit, term, type, is_active } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = {
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
    };

    // Construir condiciones de búsqueda OR (para el término)
    const searchConditions: SearchCondition[] = [];

    if (term) {
      searchConditions.push(
        { name: Like(`%${term}%`) },
        { slug: Like(`%${term}%`) },
        { description: Like(`%${term}%`) },
        { code: Like(`%${term}%`) },
        { sku: Like(`%${term}%`) },
        { barcode: Like(`%${term}%`) },
      );
    }

    // Construir condiciones de filtro AND
    const filterConditions: FilterCondition = {};

    if (is_active !== undefined) {
      if (typeof is_active === 'string') {
        filterConditions.is_active = is_active === 'true';
      } else {
        filterConditions.is_active = is_active;
      }
    }

    if (type) {
      filterConditions.type = type as ProductType;
    }

    // Combinar condiciones
    const whereConditions: WhereConditions = { ...baseConditions };

    if (
      searchConditions.length > 0 &&
      Object.keys(filterConditions).length > 0
    ) {
      // Si hay tanto búsqueda como filtros, usar OR para búsqueda y AND para filtros
      whereConditions.where = searchConditions.map((searchCondition) => ({
        ...searchCondition,
        ...filterConditions,
      }));
    } else if (searchConditions.length > 0) {
      // Solo búsqueda OR
      whereConditions.where = searchConditions;
    } else if (Object.keys(filterConditions).length > 0) {
      // Solo filtros AND
      whereConditions.where = filterConditions;
    }

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

  async findOne(id: string, userId?: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
    });

    if (!product) {
      const message = await this.translationService.translate(
        'product.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.productMapper.mapToResponseDto(product);
  }

  async findOneEntity(id: string, userId?: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
    });

    if (!product) {
      const message = await this.translationService.translate(
        'product.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId?: string,
  ): Promise<ProductResponseDto> {
    try {
      const product = await this.findOneEntity(id, userId);

      const updatedProduct = this.productRepository.merge(product, {
        name: updateProductDto.name,
        slug: updateProductDto.slug,
        description: updateProductDto.description,
        sku: updateProductDto.sku,
        code: updateProductDto.code,
        barcode: updateProductDto.barcode,
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
    } catch (error: unknown) {
      // Handle duplicate slug/SKU error in update
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('products.UQ_')
      ) {
        if (dbError?.message?.includes('slug')) {
          const message = await this.translationService.translate(
            'product.slug_already_exists',
            userId,
            { slug: updateProductDto.slug },
          );
          throw new BadRequestException(message);
        } else if (dbError?.message?.includes('sku')) {
          const message = await this.translationService.translate(
            'product.sku_already_exists',
            userId,
            { sku: updateProductDto.sku },
          );
          throw new BadRequestException(message);
        }
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const product = await this.findOneEntity(id, userId);

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
      const message = await this.translationService.translate(
        'product.cannot_delete_in_use',
        userId,
        {
          name: product.name,
          inventoryCount,
          warehouseOpeningCount,
        },
      );
      throw new BadRequestException(message);
    }

    await this.productRepository.softRemove(product);
  }

  async getProductUsage(
    id: string,
    userId?: string,
  ): Promise<{
    product: ProductResponseDto;
    inventoryCount: number;
    warehouseOpeningCount: number;
    inventory: any[];
    warehouseOpenings: any[];
  }> {
    const product = await this.findOneEntity(id, userId);

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

  async searchFromPack(term: string): Promise<ProductKeySuggestion[]> {
    try {
      const packService = await this.certificationPackFactory.getPackService();
      return await packService.searchProductKeys(term);
    } catch (error) {
      // Si es un error de pack no encontrado, lanzarlo para que el frontend lo maneje
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Para otros errores, retornar array vacío
      return [];
    }
  }
}
