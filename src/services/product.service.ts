import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import {
  Product,
  ProductType,
  InventoryStrategy,
} from '../models/product.entity';
import { ProductPrice } from '../models/product-price.entity';
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
import { SurrogateService } from './surrogate.service';
import { TenantContext } from './tenant-context.service';
import { ProductPackImportService } from './product-pack-import.service';
import { ProductPackSyncService } from './product-pack-sync.service';

interface SearchCondition {
  name?: any;
  slug?: any;
  description?: any;
  code?: any;
  sku?: any;
  barcode?: any;
  is_active?: boolean;
  type?: ProductType;
  organization_id?: string;
}

interface FilterCondition {
  is_active?: boolean;
  type?: ProductType;
  organization_id?: string;
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
    private readonly surrogateService: SurrogateService,
    private readonly tenantContext: TenantContext,
    private readonly productPackImportService: ProductPackImportService,
    private readonly productPackSyncService: ProductPackSyncService,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  async create(
    createProductDto: CreateProductDto,
    userId?: string,
  ): Promise<ProductResponseDto> {
    try {
      const [existingSlug, existingSku] = await Promise.all([
        this.productRepository.findOne({
          where: {
            slug: createProductDto.slug,
            organization_id: this.organizationId,
          },
        }),
        this.productRepository.findOne({
          where: {
            sku: createProductDto.sku,
            organization_id: this.organizationId,
          },
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
        inventory_strategy:
          createProductDto.inventory_strategy ?? InventoryStrategy.AVERAGE,
        base_price: createProductDto.base_price ?? 0,
        images: createProductDto.images
          ? JSON.stringify(createProductDto.images)
          : undefined,
      });

      if (createProductDto.prices) {
        product.prices = createProductDto.prices.map((p) => {
          const price = new ProductPrice();
          price.name = p.name;
          price.price = p.price;
          price.product = product;
          return price;
        });
      }

      // Manejar múltiples impuestos si se proporcionan
      if (createProductDto.tax_ids && createProductDto.tax_ids.length > 0) {
        product.taxes = createProductDto.tax_ids.map((taxId) => ({ id: taxId } as any));
      }

      const savedProduct = await this.productRepository.save({
        ...product,
        organization_id: this.organizationId,
      });

      // Incrementar el contador si el código coincide con el sugerido
      await this.surrogateService.useCodeIfMatches(
        'product',
        createProductDto.code,
      );

      const productWithRelations = await this.productRepository.findOne({
        where: { id: savedProduct.id, organization_id: this.organizationId },
        relations: ['brand', 'category', 'tax', 'measurement_unit', 'prices', 'taxes'],
      });

      // Sincronizar con el pack de certificación (si está configurado)
      if (productWithRelations) {
        await this.productPackSyncService.syncProduct(productWithRelations);
      }

      return this.productMapper.mapToResponseDto(
        productWithRelations ?? savedProduct,
      );
    } catch (error: unknown) {
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
      relations: ['brand', 'category', 'tax', 'measurement_unit', 'prices', 'taxes'],
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

    filterConditions.organization_id = this.organizationId;

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
      where: { id, organization_id: this.organizationId },
      relations: ['brand', 'category', 'tax', 'measurement_unit', 'prices', 'taxes'],
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
      where: { id, organization_id: this.organizationId },
      relations: ['brand', 'category', 'tax', 'measurement_unit', 'prices', 'taxes'],
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
        inventory_strategy: updateProductDto.inventory_strategy,
        base_price: updateProductDto.base_price,
        images: updateProductDto.images
          ? JSON.stringify(updateProductDto.images)
          : undefined,
      });

      // Manejar actualización de múltiples impuestos
      if (updateProductDto.tax_ids !== undefined) {
        updatedProduct.taxes = updateProductDto.tax_ids.map((taxId) => ({ id: taxId } as any));
      }

      // Manejar actualización de precios
      if (updateProductDto.prices !== undefined) {
        // Obtener los IDs de los precios que vienen en el DTO
        const incomingPriceIds = updateProductDto.prices
          .filter((p) => p.id)
          .map((p) => p.id);

        // Eliminar precios que ya no están en la lista
        if (product.prices && product.prices.length > 0) {
          updatedProduct.prices = product.prices.filter((existingPrice) =>
            incomingPriceIds.includes(existingPrice.id),
          );
        } else {
          updatedProduct.prices = [];
        }

        // Actualizar o crear precios
        for (const priceDto of updateProductDto.prices) {
          if (priceDto.id) {
            // Actualizar precio existente
            const existingPrice = updatedProduct.prices.find(
              (p) => p.id === priceDto.id,
            );
            if (existingPrice) {
              existingPrice.name = priceDto.name;
              existingPrice.price = priceDto.price;
            }
          } else {
            // Crear nuevo precio
            const newPrice = new ProductPrice();
            newPrice.name = priceDto.name;
            newPrice.price = priceDto.price;
            newPrice.product = updatedProduct;
            newPrice.organization_id = this.organizationId;
            updatedProduct.prices.push(newPrice);
          }
        }
      }

      const savedProduct = await this.productRepository.save(updatedProduct);
      const productWithRelations = await this.productRepository.findOne({
        where: { id: savedProduct.id, organization_id: this.organizationId },
        relations: ['brand', 'category', 'tax', 'measurement_unit', 'prices', 'taxes'],
      });

      // Sincronizar con el pack de certificación (si está configurado)
      if (productWithRelations) {
        await this.productPackSyncService.syncProduct(productWithRelations);
      }

      return this.productMapper.mapToResponseDto(
        productWithRelations ?? savedProduct,
      );
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
      where: { product_id: id, organization_id: this.organizationId },
      withDeleted: false,
    });

    // Verificar si el producto está siendo usado en warehouse openings
    const warehouseOpeningCount = await this.warehouseOpeningRepository.count({
      where: { productId: id, organization_id: this.organizationId },
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

  async removeMany(ids: string[]): Promise<void> {
    await this.productRepository.softDelete({
      id: ids as any,
      organization_id: this.organizationId,
    });
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
      where: { product: { id }, organization_id: this.organizationId },
      select: ['id', 'quantity', 'price'],
      relations: ['warehouse'],
      withDeleted: false,
    });

    const warehouseOpenings = await this.warehouseOpeningRepository.find({
      where: { product: { id }, organization_id: this.organizationId },
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

  async updateStock(
    id: string,
    quantity: number,
    manager?: any,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(Product)
      : this.productRepository;
    const product = await repo.findOne({
      where: { id, organization_id: this.organizationId },
    });
    if (product) {
      product.total_stock = Number(product.total_stock || 0) + Number(quantity);
      await repo.save(product, { reload: false });
    }
  }

  async searchFromPack(term: string): Promise<ProductKeySuggestion[]> {
    console.log('='.repeat(80));
    console.log('[Product Service] searchFromPack CALLED');
    console.log('[Product Service] Search term:', term);
    console.log('[Product Service] Term length:', term?.length);
    console.log('[Product Service] Term type:', typeof term);
    
    try {
      // Usar API pública de factura123.mx (no requiere autenticación)
      const url = `https://factura123.mx/api/v2/public/cat/prodclasses?search=${encodeURIComponent(term)}&order=asc&offset=0&limit=20`;
      console.log('[Product Service] Request URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      console.log('[Product Service] factura123.mx response status:', response.status);
      console.log('[Product Service] factura123.mx response statusText:', response.statusText);

      if (!response.ok) {
        console.log('[Product Service] factura123.mx request failed, using static fallback');
        const staticResults = this.getStaticProductKeys(term);
        console.log('[Product Service] Static fallback results count:', staticResults.length);
        console.log('[Product Service] Static fallback results:', JSON.stringify(staticResults, null, 2));
        console.log('='.repeat(80));
        return staticResults;
      }

      const data = await response.json();
      //console.log('[Product Service] factura123.mx RAW response data:', JSON.stringify(data, null, 2));
      
      // Adaptar la respuesta de factura123.mx al formato esperado
      // La API regresa { rows: [...], total: number }
      const items = data.rows || data.data || data || [];
      const results = items.map((item: any) => ({
        key: item.clavesat || item.clave || item.code || item.key,
        description: item.descripcion || item.description || item.name,
        score: 0,
      }));
      
      // Ordenar por longitud de descripción (más cortas primero)
      results.sort((a, b) => {
        const lengthA = a.description?.length || 0;
        const lengthB = b.description?.length || 0;
        return lengthA - lengthB;
      });
      
      console.log('[Product Service] Processed results count:', results.length);
      console.log('[Product Service] Sorted results (by description length):', JSON.stringify(results, null, 2));
      console.log('='.repeat(80));
      return results;
    } catch (error) {
      console.error('[Product Service] ERROR in searchFromPack:', error);
      console.error('[Product Service] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      const staticResults = this.getStaticProductKeys(term);
      console.log('[Product Service] Returning static fallback after error, count:', staticResults.length);
      console.log('='.repeat(80));
      return staticResults;
    }
  }

  private getStaticProductKeys(term: string): ProductKeySuggestion[] {
    const products = [
      { key: '01010101', description: 'No existe en el catálogo' },
      { key: '80141600', description: 'Servicios de consultoría' },
      { key: '80141601', description: 'Servicios de consultoría de negocios y administración corporativa' },
      { key: '80141602', description: 'Servicios de consultoría de mercadotecnia' },
      { key: '80141603', description: 'Servicios de consultoría de administración de recursos humanos' },
      { key: '80141604', description: 'Servicios de consultoría de producción' },
      { key: '80141605', description: 'Servicios de consultoría de administración de cadena de suministros' },
      { key: '81112000', description: 'Servicios de desarrollo de software' },
      { key: '81112001', description: 'Servicios de desarrollo de software de aplicación' },
      { key: '81112002', description: 'Servicios de desarrollo de software de sistemas y aplicaciones de usuario' },
      { key: '81161500', description: 'Servicios de diseño gráfico' },
      { key: '43230000', description: 'Computadoras' },
      { key: '43211500', description: 'Computadoras portátiles' },
      { key: '84111506', description: 'Servicios de facturación' },
      { key: '84101600', description: 'Financiación de ayudas' },
    ];

    if (!term) return products.slice(0, 10);

    const lowerTerm = term.toLowerCase();
    return products
      .filter(
        p =>
          p.key.includes(term) ||
          p.description.toLowerCase().includes(lowerTerm),
      )
      .slice(0, 20);
  }

  async importFromPack(userId?: string): Promise<any> {
    return this.productPackImportService.importAllFromPack(userId);
  }
}
