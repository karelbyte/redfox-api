import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType, InventoryStrategy } from '../models/product.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { TranslationService } from './translation.service';
import { TenantContext } from './tenant-context.service';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { Tax, TaxType } from '../models/tax.entity';
import { ProductResponse } from '../interfaces/certification-pack.interface';

interface ImportProductsFromPackResponseDto {
  totalFromPack: number;
  created: number;
  updated: number;
  skipped: number;
}

@Injectable()
export class ProductPackImportService {
  private readonly logger = new Logger(ProductPackImportService.name);
  private taxCache: Map<string, Tax> = new Map();
  private measurementUnitCache: string | null = null;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(MeasurementUnit)
    private readonly measurementUnitRepository: Repository<MeasurementUnit>,
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly translationService: TranslationService,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  /**
   * Trunca un string al tamaño máximo especificado
   */
  private truncate(value: string | undefined | null, maxLength: number): string {
    if (!value) return '';
    return value.length > maxLength ? value.substring(0, maxLength) : value;
  }

  private async generateUniqueSlug(base: string): Promise<string> {
    const normalized = base
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios con guiones
      .slice(0, 100);
    
    const existing = await this.productRepository.findOne({
      where: { slug: normalized, organization_id: this.organizationId },
      withDeleted: true,
    });
    
    if (!existing) return normalized;

    // Si existe, agregar un sufijo único
    const suffix = `-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return (normalized.slice(0, 100 - suffix.length) + suffix).slice(0, 100);
  }

  private async generateUniqueCode(base: string): Promise<string> {
    // Limitar a 20 caracteres desde el inicio
    const normalized = base.slice(0, 20);
    const existing = await this.productRepository.findOne({
      where: { code: normalized, organization_id: this.organizationId },
      withDeleted: true,
    });
    if (!existing) return normalized;

    // Si existe, agregar sufijo corto que quepa en 20 caracteres
    const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos
    const maxBaseLength = 20 - timestamp.length - 1; // -1 por el guion
    return `${base.slice(0, maxBaseLength)}-${timestamp}`;
  }

  private async generateUniqueSku(base: string): Promise<string> {
    // Limitar a 50 caracteres desde el inicio
    const normalized = base.slice(0, 50);
    const existing = await this.productRepository.findOne({
      where: { sku: normalized, organization_id: this.organizationId },
      withDeleted: true,
    });
    if (!existing) return normalized;

    // Si existe, agregar sufijo corto que quepa en 50 caracteres
    const timestamp = Date.now().toString().slice(-8); // Últimos 8 dígitos
    const maxBaseLength = 50 - timestamp.length - 1; // -1 por el guion
    return `${base.slice(0, maxBaseLength)}-${timestamp}`;
  }

  private async getOrCreateDefaultMeasurementUnit(): Promise<string> {
    // Usar caché si ya existe
    if (this.measurementUnitCache) {
      return this.measurementUnitCache;
    }

    // Buscar unidad de medida por defecto (E48 - Unidad de servicio)
    let unit = await this.measurementUnitRepository.findOne({
      where: { code: 'E48', organization_id: this.organizationId },
    });

    if (!unit) {
      // Crear unidad de medida por defecto
      unit = this.measurementUnitRepository.create({
        code: 'E48',
        description: 'Unidad de servicio',
        organization_id: this.organizationId,
      });
      await this.measurementUnitRepository.save(unit);
    }

    this.measurementUnitCache = unit.id;
    return unit.id;
  }

  private async getOrCreateDefaultTax(): Promise<Tax> {
    const cacheKey = 'IVA-16';
    
    // Usar caché si ya existe
    if (this.taxCache.has(cacheKey)) {
      return this.taxCache.get(cacheKey)!;
    }

    // Buscar impuesto por defecto (IVA 16%)
    let tax = await this.taxRepository.findOne({
      where: { name: 'IVA', value: 16, organization_id: this.organizationId },
    });

    if (!tax) {
      // Crear impuesto por defecto
      tax = this.taxRepository.create({
        code: 'IVA16',
        name: 'IVA',
        value: 16,
        type: TaxType.PERCENTAGE,
        organization_id: this.organizationId,
      });
      await this.taxRepository.save(tax);
    }

    this.taxCache.set(cacheKey, tax);
    return tax;
  }

  /**
   * Obtiene o crea impuestos basados en los datos del pack
   */
  private async getOrCreateTaxesFromPackData(packTaxes: any[]): Promise<Tax[]> {
    if (!packTaxes || packTaxes.length === 0) {
      const defaultTax = await this.getOrCreateDefaultTax();
      return [defaultTax];
    }

    const taxes: Tax[] = [];
    
    for (const packTax of packTaxes) {
      // El rate viene como decimal (ej: 0.16 para 16%)
      const taxValue = packTax.rate * 100;
      
      // Validar que el valor sea un número válido y mayor a 0
      if (isNaN(taxValue) || taxValue <= 0) {
        this.logger.warn(`Skipping invalid tax: ${JSON.stringify(packTax)}`);
        continue;
      }
      
      const taxName = packTax.type || 'IVA';
      const cacheKey = `${taxName}-${taxValue}`;
      
      // Verificar caché primero
      if (this.taxCache.has(cacheKey)) {
        taxes.push(this.taxCache.get(cacheKey)!);
        continue;
      }

      // Buscar impuesto existente por nombre y valor
      let tax = await this.taxRepository.findOne({
        where: {
          name: taxName,
          value: taxValue,
          organization_id: this.organizationId,
        },
      });

      if (!tax) {
        // Generar código único para el impuesto
        const code = `${taxName}${Math.round(taxValue)}`;
        
        // Crear nuevo impuesto
        tax = this.taxRepository.create({
          code,
          name: taxName,
          value: taxValue,
          type: TaxType.PERCENTAGE,
          organization_id: this.organizationId,
        });
        
        try {
          await this.taxRepository.save(tax);
        } catch (error: any) {
          // Si falla por duplicado, intentar buscar de nuevo
          if (error.code === '23505') { // Código de error de PostgreSQL para violación de unicidad
            tax = await this.taxRepository.findOne({
              where: {
                name: taxName,
                value: taxValue,
                organization_id: this.organizationId,
              },
            });
            if (!tax) {
              throw error; // Si aún no existe, lanzar el error original
            }
          } else {
            throw error;
          }
        }
      }

      this.taxCache.set(cacheKey, tax);
      taxes.push(tax);
    }

    // Si no se encontró ningún impuesto válido, usar el default
    if (taxes.length === 0) {
      const defaultTax = await this.getOrCreateDefaultTax();
      return [defaultTax];
    }

    return taxes;
  }

  /**
   * Importa todos los productos desde el pack activo hacia nuestra DB.
   */
  async importAllFromPack(
    userId?: string,
  ): Promise<ImportProductsFromPackResponseDto> {
    // Limpiar cachés al inicio de cada importación
    this.taxCache.clear();
    this.measurementUnitCache = null;

    let packService: any;
    try {
      packService = await this.certificationPackFactory.getPackService();
    } catch (error: any) {
      const msg = await this.translationService.translate(
        'product.pack_not_configured',
        userId,
      );
      throw new BadRequestException(msg || 'No certification pack configured');
    }

    if (
      !packService?.listProducts ||
      typeof packService.listProducts !== 'function'
    ) {
      const msg = await this.translationService.translate(
        'product.pack_list_not_supported',
        userId,
      );
      throw new BadRequestException(msg || 'Pack does not support listing products');
    }

    const products: ProductResponse[] = await packService.listProducts();

    console.log(products.length)

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const defaultMeasurementUnitId = await this.getOrCreateDefaultMeasurementUnit();

    for (const packProduct of products) {
      try {
        // Buscar por product_pack_id que es el identificador único del pack externo
        const existing = await this.productRepository.findOne({
          where: { 
            product_pack_id: packProduct.id,
            organization_id: this.organizationId 
          },
          relations: ['taxes'],
          withDeleted: false,
        });

        // Obtener o crear impuestos basados en los datos del pack
        const taxes = await this.getOrCreateTaxesFromPackData(packProduct.taxes || []);

        if (existing) {
          // Actualizar producto existente
          existing.name = this.truncate(packProduct.description, 100) || existing.name;
          existing.description = this.truncate(packProduct.description, 255) || existing.description;
          existing.code = this.truncate(String(packProduct.product_key || '01010101'), 20);
          if (packProduct.sku) {
            existing.sku = this.truncate(packProduct.sku, 50);
          }
          if (packProduct.price) {
            existing.base_price = packProduct.price;
          }
          // Actualizar impuestos
          existing.taxes = taxes;
          await this.productRepository.save(existing);
          updated += 1;
          continue;
        }

        // Crear nuevo producto
        const productKey = String(packProduct.product_key);
        const code = productKey //await this.generateUniqueCode(productKey);
        const sku = await this.generateUniqueSku(packProduct.sku || `PACK-${productKey}`);
        const slug = await this.generateUniqueSlug(
          packProduct.description || `product-${productKey}`
        );

        const product = this.productRepository.create({
          name: this.truncate(packProduct.description, 100) || 'Producto importado',
          slug,
          description: this.truncate(packProduct.description, 255) || 'Importado del pack',
          code,
          sku,
          product_pack_id: packProduct.id,
          measurement_unit: { id: defaultMeasurementUnitId },
          taxes,
          is_active: true,
          type: ProductType.SERVICE,
          inventory_strategy: InventoryStrategy.AVERAGE,
          base_price: packProduct.price || 0,
          organization_id: this.organizationId,
        });

        await this.productRepository.save(product);
        created += 1;
      } catch (error: any) {
        console.log(error) 
        skipped += 1;
        this.logger.error(
          `Failed to import product: ${JSON.stringify({
            id: packProduct?.id,
            description: packProduct?.description,
            product_key: packProduct?.product_key,
            sku: packProduct?.sku,
            error: error?.message,
            stack: error?.stack,
          }, null, 2)}`,
        );
      }
    }

    return {
      totalFromPack: products.length,
      created,
      updated,
      skipped,
    };
  }
}
