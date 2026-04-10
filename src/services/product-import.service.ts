import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Product,
  ProductType,
  InventoryStrategy,
} from '../models/product.entity';
import { Brand } from '../models/brand.entity';
import { Category } from '../models/category.entity';
import { MeasurementUnit } from '../models/measurement-unit.entity';
import { Tax } from '../models/tax.entity';
import { TenantContext } from './tenant-context.service';

export interface ImportProductRow {
  row: number;
  name: string;
  sku: string;
  code: string;
  description?: string;
  base_price?: number;
  type?: string;
  inventory_strategy?: string;
  brand?: string;
  category?: string;
  measurement_unit: string;
  tax?: string;
  barcode?: string;
  min_stock?: number;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; sku: string; name: string; reason: string }[];
  warnings: {
    row: number;
    sku: string;
    name: string;
    field: string;
    reason: string;
  }[];
  summary: string;
}

@Injectable()
export class ProductImportService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(MeasurementUnit)
    private readonly measurementUnitRepo: Repository<MeasurementUnit>,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  private async ensureUniqueSlugForOrg(
    base: string,
    orgId: string,
  ): Promise<string> {
    let slug = base;
    let i = 1;
    while (
      await this.productRepo.findOne({
        where: { slug, organization_id: orgId },
      })
    ) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    return this.ensureUniqueSlugForOrg(base, this.organizationId);
  }

  /**
   * Parsea un buffer CSV o XLSX y devuelve filas normalizadas.
   * Soporta separadores , y ;
   */
  parseCSV(buffer: Buffer): ImportProductRow[] {
    const text = buffer
      .toString('utf-8')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2)
      throw new BadRequestException('El archivo no tiene datos suficientes');

    // Detectar separador
    const sep = lines[0].includes(';') ? ';' : ',';

    const headers = lines[0].split(sep).map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, ''),
    );

    const rows: ImportProductRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.splitCSVLine(line, sep);
      const firstVal = (values[0] || '')
        .trim()
        .replace(/^"(.*)"$/, '$1')
        .toLowerCase();
      if (this.isMetadataRow(firstVal)) continue;
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (values[idx] || '').trim();
      });

      rows.push({
        row: i + 1,
        name: obj['name'] || obj['nombre'] || '',
        sku: obj['sku'] || '',
        code: obj['code'] || obj['codigo_sat'] || obj['codigo'] || '',
        description: obj['description'] || obj['descripcion'] || '',
        base_price:
          obj['base_price'] || obj['precio'] || obj['precio_base']
            ? Number(obj['base_price'] || obj['precio'] || obj['precio_base'])
            : undefined,
        type: obj['type'] || obj['tipo'] || 'tangible',
        inventory_strategy:
          obj['inventory_strategy'] || obj['estrategia'] || 'average',
        brand: obj['brand'] || obj['marca'] || '',
        category: obj['category'] || obj['categoria'] || '',
        measurement_unit:
          obj['measurement_unit'] ||
          obj['unidad_medida'] ||
          obj['unidad'] ||
          '',
        tax: obj['tax'] || obj['impuesto'] || obj['tax_code'] || '',
        barcode: obj['barcode'] || obj['codigo_barras'] || '',
        min_stock:
          obj['min_stock'] || obj['stock_minimo']
            ? Number(obj['min_stock'] || obj['stock_minimo'])
            : undefined,
        weight:
          obj['weight'] || obj['peso']
            ? Number(obj['weight'] || obj['peso'])
            : undefined,
        width:
          obj['width'] || obj['ancho']
            ? Number(obj['width'] || obj['ancho'])
            : undefined,
        height:
          obj['height'] || obj['alto']
            ? Number(obj['height'] || obj['alto'])
            : undefined,
        length:
          obj['length'] || obj['largo']
            ? Number(obj['length'] || obj['largo'])
            : undefined,
      });
    }
    return rows;
  }

  private isMetadataRow(firstVal: string): boolean {
    const metaValues = [
      'requerido',
      'opcional',
      'required',
      'optional',
      '必填',
      '可选',
    ];
    return (
      metaValues.includes(firstVal) ||
      firstVal.startsWith('tipo:') ||
      firstVal.startsWith('type:')
    );
  }

  private splitCSVLine(line: string, sep: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  /** Llamado desde el processor (background job) — recibe orgId explícito */
  async importRowsWithOrg(
    rows: ImportProductRow[],
    overrideOrgId: string,
  ): Promise<ImportResult> {
    return this._importRows(rows, overrideOrgId);
  }

  async importRows(rows: ImportProductRow[]): Promise<ImportResult> {
    return this._importRows(rows, this.organizationId);
  }

  private async _importRows(
    rows: ImportProductRow[],
    orgId: string,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      created: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      summary: '',
    };

    // Pre-cargar catálogos de la organización para evitar N+1
    const [brands, categories, units, taxes] = await Promise.all([
      this.brandRepo.find({ where: { organization_id: orgId } }),
      this.categoryRepo.find({ where: { organization_id: orgId } }),
      this.measurementUnitRepo.find({ where: { organization_id: orgId } }),
      this.taxRepo.find({ where: { organization_id: orgId } }),
    ]);

    const brandMap = new Map(brands.map((b) => [b.code.toLowerCase(), b]));
    const categoryMap = new Map(
      categories.map((c) => [c.name.toLowerCase(), c]),
    );
    const unitMap = new Map(units.map((u) => [u.code.toLowerCase(), u]));
    // Impuestos: buscar por código (ej: IVA) o por nombre
    const taxMap = new Map([
      ...taxes.map((t) => [t.code.toLowerCase(), t] as [string, Tax]),
      ...taxes.map((t) => [t.name.toLowerCase(), t] as [string, Tax]),
    ]);

    for (const row of rows) {
      try {
        // Validaciones requeridas
        if (!row.name?.trim()) {
          result.errors.push({
            row: row.row,
            sku: row.sku,
            name: row.name,
            reason: 'El campo "name" es requerido',
          });
          continue;
        }
        if (!row.sku?.trim()) {
          result.errors.push({
            row: row.row,
            sku: '',
            name: row.name,
            reason: 'El campo "sku" es requerido',
          });
          continue;
        }
        if (!row.code?.trim() || row.code.trim().length < 8) {
          result.errors.push({
            row: row.row,
            sku: row.sku,
            name: row.name,
            reason:
              'El campo "code" (código SAT) es requerido y debe tener al menos 8 caracteres',
          });
          continue;
        }
        if (!row.measurement_unit?.trim()) {
          result.errors.push({
            row: row.row,
            sku: row.sku,
            name: row.name,
            reason: 'El campo "measurement_unit" es requerido',
          });
          continue;
        }

        // Verificar duplicado por SKU
        const existing = await this.productRepo.findOne({
          where: { sku: row.sku.trim(), organization_id: orgId },
        });
        if (existing) {
          result.errors.push({
            row: row.row,
            sku: row.sku,
            name: row.name,
            reason: `SKU "${row.sku}" ya existe — omitido para evitar duplicado`,
          });
          result.skipped++;
          continue;
        }

        // Unidad de medida — requerida, bloquea si no existe
        const unit = unitMap.get(row.measurement_unit.toLowerCase());
        if (!unit) {
          result.errors.push({
            row: row.row,
            sku: row.sku,
            name: row.name,
            reason: `Unidad de medida "${row.measurement_unit}" no encontrada. Verifica que exista en Productos > Unidades de Medida.`,
          });
          continue;
        }

        // Marca — opcional, advertencia si se especificó pero no existe
        const brand = row.brand?.trim()
          ? brandMap.get(row.brand.toLowerCase())
          : undefined;
        if (row.brand?.trim() && !brand) {
          result.warnings.push({
            row: row.row,
            sku: row.sku,
            name: row.name,
            field: 'brand',
            reason: `Marca "${row.brand}" no encontrada — el producto se creó sin marca. Créala en Productos > Marcas.`,
          });
        }

        // Categoría — opcional, advertencia si se especificó pero no existe
        const category = row.category?.trim()
          ? categoryMap.get(row.category.toLowerCase())
          : undefined;
        if (row.category?.trim() && !category) {
          result.warnings.push({
            row: row.row,
            sku: row.sku,
            name: row.name,
            field: 'category',
            reason: `Categoría "${row.category}" no encontrada — el producto se creó sin categoría. Créala en Productos > Categorías.`,
          });
        }

        // Impuesto — opcional, advertencia si se especificó pero no existe
        const tax = row.tax?.trim()
          ? taxMap.get(row.tax.toLowerCase())
          : undefined;
        if (row.tax?.trim() && !tax) {
          result.warnings.push({
            row: row.row,
            sku: row.sku,
            name: row.name,
            field: 'tax',
            reason: `Impuesto "${row.tax}" no encontrado — el producto se creó sin impuesto. Créalo en Productos > Impuestos.`,
          });
        }

        // Validar type e inventory_strategy
        const validTypes = ['tangible', 'service', 'digital'];
        const validStrategies = ['fifo', 'fefo', 'average'];
        const type = validTypes.includes((row.type || '').toLowerCase())
          ? (row.type!.toLowerCase() as ProductType)
          : ProductType.TANGIBLE;
        const strategy = validStrategies.includes(
          (row.inventory_strategy || '').toLowerCase(),
        )
          ? (row.inventory_strategy!.toLowerCase() as InventoryStrategy)
          : InventoryStrategy.AVERAGE;

        // Generar slug único
        const slug = await this.ensureUniqueSlugForOrg(
          this.generateSlug(row.name.trim()),
          orgId,
        );

        const product = this.productRepo.create({
          name: row.name.trim(),
          slug,
          sku: row.sku.trim(),
          code: row.code.trim(),
          description: row.description?.trim() || row.name.trim(),
          base_price: isNaN(Number(row.base_price))
            ? 0
            : Number(row.base_price),
          type,
          inventory_strategy: strategy,
          measurement_unit: unit,
          ...(brand ? { brand } : {}),
          ...(category ? { category } : {}),
          ...(tax ? { tax } : {}),
          barcode: row.barcode?.trim() || undefined,
          min_stock: isNaN(Number(row.min_stock)) ? 0 : Number(row.min_stock),
          weight: row.weight,
          width: row.width,
          height: row.height,
          length: row.length,
          is_active: true,
          organization_id: orgId,
        });

        await this.productRepo.save(product);
        result.created++;
      } catch (err: any) {
        result.errors.push({
          row: row.row,
          sku: row.sku || '',
          name: row.name || '',
          reason: err?.message || 'Error desconocido',
        });
      }
    }

    result.summary = `Importación completada: ${result.created} creados, ${result.skipped} omitidos (duplicados), ${result.errors.length} errores, ${result.warnings.length} advertencias.`;
    return result;
  }
}
