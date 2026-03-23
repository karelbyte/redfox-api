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
  private measurementUnitCache: Map<string, string> = new Map();



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

  /**
   * Busca o crea una unidad de medida por su código SAT.
   * Cada pack retorna unit_key/unit_name en ProductResponse — se usa directamente.
   * Fallback: E48 (Unidad de servicio) si el pack no envía unit_key.
   */
  private async getOrCreateMeasurementUnit(
    code: string = 'E48',
    description: string = 'Unidad de servicio',
  ): Promise<string> {
    const cacheKey = `${this.organizationId}:${code}`;
    if (this.measurementUnitCache.has(cacheKey)) {
      return this.measurementUnitCache.get(cacheKey)!;
    }

    let unit = await this.measurementUnitRepository.findOne({
      where: { code, organization_id: this.organizationId },
    });

    if (!unit) {
      unit = this.measurementUnitRepository.create({
        code,
        description,
        organization_id: this.organizationId,
      });
      await this.measurementUnitRepository.save(unit);
    }

    this.measurementUnitCache.set(cacheKey, unit.id);
    return unit.id;
  }

  private async getOrCreateDefaultTax(): Promise<Tax> {
    const cacheKey = 'IVA-16';
    if (this.taxCache.has(cacheKey)) {
      return this.taxCache.get(cacheKey)!;
    }

    let tax = await this.taxRepository.findOne({
      where: { code: 'IVA', value: 16, organization_id: this.organizationId },
    });

    if (!tax) {
      tax = this.taxRepository.create({
        code: 'IVA',
        name: 'IVA 16%',
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
   * Obtiene o crea impuestos basados en los datos del pack.
   * Estrategia:
   * - Busca por (name, value, organization_id) — evita duplicados con impuestos ya existentes
   * - Si no existe, usa el type del pack como code (ej. "IVA", "IEPS")
   * - Solo agrega sufijo numérico si hay colisión de code con otro impuesto de distinto valor
   */
  private async getOrCreateTaxesFromPackData(packTaxes: any[]): Promise<Tax[]> {
    if (!packTaxes || packTaxes.length === 0) {
      const defaultTax = await this.getOrCreateDefaultTax();
      return [defaultTax];
    }

    const taxes: Tax[] = [];

    for (const packTax of packTaxes) {
      const taxValue = Math.round(packTax.rate * 100 * 100) / 100; // evitar floating point (0.16 -> 16.00)
      const taxName = (packTax.type || 'IVA').toUpperCase();

      if (isNaN(taxValue) || taxValue <= 0) {
        this.logger.warn(`Skipping invalid tax: ${JSON.stringify(packTax)}`);
        continue;
      }

      const cacheKey = `${taxName}-${taxValue}`;
      if (this.taxCache.has(cacheKey)) {
        taxes.push(this.taxCache.get(cacheKey)!);
        continue;
      }

      // Buscar por code + value — si ya existe (creado manualmente o en import anterior), reutilizar
      let tax = await this.taxRepository.findOne({
        where: { code: taxName, value: taxValue, organization_id: this.organizationId },
      });

      if (!tax) {
        // code = tipo SAT oficial (IVA, IEPS, ISR) — el índice único es (org, code, value)
        // name = descripción legible generada automáticamente
        const code = taxName;
        const name = `${taxName} ${Math.round(taxValue)}%`;

        tax = this.taxRepository.create({
          code,
          name,
          value: taxValue,
          type: TaxType.PERCENTAGE,
          organization_id: this.organizationId,
        });

        try {
          await this.taxRepository.save(tax);
        } catch (error: any) {
          if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
            tax = await this.taxRepository.findOne({
              where: { code, value: taxValue, organization_id: this.organizationId },
            });
            if (!tax) throw error;
          } else {
            throw error;
          }
        }
      }

      this.taxCache.set(cacheKey, tax);
      taxes.push(tax);
    }

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
    this.measurementUnitCache = new Map();

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

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const packProduct of products) {
      try {
        const existing = await this.productRepository.findOne({
          where: { 
            product_pack_id: packProduct.id,
            organization_id: this.organizationId 
          },
          relations: ['taxes'],
          withDeleted: false,
        });

        const taxes = await this.getOrCreateTaxesFromPackData(packProduct.taxes || []);

        // Resolver unidad de medida desde los datos del pack (unit_key / unit_name)
        const measurementUnitId = await this.getOrCreateMeasurementUnit(
          packProduct.unit_key || 'E48',
          packProduct.unit_name || 'Unidad de servicio',
        );

        if (existing) {
          existing.name = this.truncate(packProduct.description, 100) || existing.name;
          existing.description = this.truncate(packProduct.description, 255) || existing.description;
          existing.code = this.truncate(String(packProduct.product_key || '01010101'), 20);
          if (packProduct.sku) {
            existing.sku = this.truncate(packProduct.sku, 50);
          }
          if (packProduct.price) {
            existing.base_price = packProduct.price;
          }
          existing.measurement_unit = { id: measurementUnitId } as any;
          existing.taxes = taxes;
          await this.productRepository.save(existing);
          updated += 1;
          continue;
        }

        const productKey = String(packProduct.product_key);
        const code = productKey;
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
          measurement_unit: { id: measurementUnitId },
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
        skipped += 1;
        this.logger.error(
          `Failed to import product ${packProduct?.id} (${packProduct?.description}): ${error?.message}`,
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
