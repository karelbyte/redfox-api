/**
 * Tests unitarios para ProductImportService.
 * Verifican validaciones, detección de duplicados, warnings y creación correcta.
 */

import { BadRequestException } from '@nestjs/common';
import { ProductType, InventoryStrategy } from '../../src/models/product.entity';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUnit = { id: 'mu-1', code: 'ltr', description: 'Litro' };
const mockBrand = { id: 'brand-1', code: 'lala', name: 'Lala' };
const mockCategory = { id: 'cat-1', name: 'Lácteos' };

const mockProductRepo = {
  findOne: jest.fn().mockResolvedValue(null), // sin duplicados por defecto
  create: jest.fn().mockImplementation((data: any) => data),
  save: jest.fn().mockImplementation((data: any) => Promise.resolve({ id: 'new-prod', ...data })),
};

const mockBrandRepo = {
  find: jest.fn().mockResolvedValue([mockBrand]),
};

const mockCategoryRepo = {
  find: jest.fn().mockResolvedValue([mockCategory]),
};

const mockUnitRepo = {
  find: jest.fn().mockResolvedValue([mockUnit]),
};

const mockTaxRepo = {
  find: jest.fn().mockResolvedValue([]),
};

const mockTenantContext = {
  getOrganizationId: jest.fn().mockReturnValue('org-1'),
};

async function makeService() {
  const { ProductImportService } = await import('../../src/services/product-import.service');
  return new (ProductImportService as any)(
    mockProductRepo,
    mockBrandRepo,
    mockCategoryRepo,
    mockUnitRepo,
    mockTaxRepo,
    mockTenantContext,
  );
}

function csv(...rows: string[]): Buffer {
  return Buffer.from(rows.join('\r\n'), 'utf-8');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProductImportService', () => {
  let service: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockProductRepo.findOne.mockResolvedValue(null);
    mockBrandRepo.find.mockResolvedValue([mockBrand]);
    mockCategoryRepo.find.mockResolvedValue([mockCategory]);
    mockUnitRepo.find.mockResolvedValue([mockUnit]);
    mockTaxRepo.find.mockResolvedValue([]);
    service = await makeService();
  });

  // ── parseCSV ───────────────────────────────────────────────────────────────

  describe('parseCSV', () => {
    it('parsea correctamente una fila válida', () => {
      const buf = csv(
        'name,sku,code,measurement_unit,base_price,type',
        'Leche Entera,LECH-001,50211503,LTR,25.00,tangible',
      );
      const rows = service.parseCSV(buf);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        name: 'Leche Entera',
        sku: 'LECH-001',
        code: '50211503',
        measurement_unit: 'LTR',
        base_price: 25,
        type: 'tangible',
      });
    });

    it('ignora filas de metadatos REQUERIDO/opcional', () => {
      const buf = csv(
        'name,sku,code,measurement_unit',
        'REQUERIDO,REQUERIDO,REQUERIDO,REQUERIDO',
        'Tipo: texto,Tipo: texto,Tipo: texto,Tipo: código',
        'Leche Entera,LECH-001,50211503,LTR',
      );
      const rows = service.parseCSV(buf);
      expect(rows).toHaveLength(1);
    });

    it('lanza error si el archivo está vacío', () => {
      const buf = csv('name,sku,code,measurement_unit');
      expect(() => service.parseCSV(buf)).toThrow(BadRequestException);
    });

    it('soporta separador punto y coma', () => {
      const buf = csv(
        'name;sku;code;measurement_unit',
        'Leche;LECH-001;50211503;LTR',
      );
      const rows = service.parseCSV(buf);
      expect(rows).toHaveLength(1);
      expect(rows[0].sku).toBe('LECH-001');
    });

    it('parsea múltiples filas', () => {
      const buf = csv(
        'name,sku,code,measurement_unit',
        'Producto A,SKU-A,12345678,H87',
        'Producto B,SKU-B,87654321,LTR',
        'Producto C,SKU-C,11111111,KGM',
      );
      const rows = service.parseCSV(buf);
      expect(rows).toHaveLength(3);
    });
  });

  // ── importRows (validaciones) ──────────────────────────────────────────────

  describe('importRows — validaciones', () => {
    it('rechaza fila sin name', async () => {
      const result = await service._importRows([
        { row: 2, name: '', sku: 'SKU-1', code: '12345678', measurement_unit: 'LTR' },
      ], 'org-1');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('name');
      expect(result.created).toBe(0);
    });

    it('rechaza fila sin sku', async () => {
      const result = await service._importRows([
        { row: 2, name: 'Producto', sku: '', code: '12345678', measurement_unit: 'LTR' },
      ], 'org-1');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('sku');
    });

    it('rechaza fila con código SAT menor a 8 caracteres', async () => {
      const result = await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '1234', measurement_unit: 'LTR' },
      ], 'org-1');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('code');
    });

    it('rechaza fila sin measurement_unit', async () => {
      const result = await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '12345678', measurement_unit: '' },
      ], 'org-1');
      expect(result.errors).toHaveLength(1);
    });

    it('rechaza fila con unidad de medida que no existe', async () => {
      mockUnitRepo.find.mockResolvedValue([]); // sin unidades
      service = await makeService();
      const result = await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '12345678', measurement_unit: 'XYZ' },
      ], 'org-1');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('XYZ');
    });

    it('omite fila con SKU duplicado y lo cuenta como skipped', async () => {
      mockProductRepo.findOne.mockResolvedValue({ id: 'existing', sku: 'LECH-001' });
      const result = await service._importRows([
        { row: 2, name: 'Leche', sku: 'LECH-001', code: '50211503', measurement_unit: 'LTR' },
      ], 'org-1');
      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
    });
  });

  // ── importRows (warnings) ──────────────────────────────────────────────────

  describe('importRows — warnings', () => {
    it('crea el producto pero emite warning si la marca no existe', async () => {
      const result = await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '12345678', measurement_unit: 'ltr', brand: 'MarcaInexistente' },
      ], 'org-1');
      expect(result.created).toBe(1);
      expect(result.warnings.some((w: any) => w.field === 'brand')).toBe(true);
    });

    it('crea el producto pero emite warning si la categoría no existe', async () => {
      const result = await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '12345678', measurement_unit: 'ltr', category: 'CatInexistente' },
      ], 'org-1');
      expect(result.created).toBe(1);
      expect(result.warnings.some((w: any) => w.field === 'category')).toBe(true);
    });

    it('no emite warning si la marca existe', async () => {
      const result = await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '12345678', measurement_unit: 'ltr', brand: 'lala' },
      ], 'org-1');
      expect(result.created).toBe(1);
      expect(result.warnings.filter((w: any) => w.field === 'brand')).toHaveLength(0);
    });
  });

  // ── importRows (creación correcta) ────────────────────────────────────────

  describe('importRows — creación', () => {
    it('crea producto con valores por defecto si type e inventory_strategy son inválidos', async () => {
      await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '12345678', measurement_unit: 'ltr', type: 'invalido', inventory_strategy: 'invalido' },
      ], 'org-1');
      expect(mockProductRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ProductType.TANGIBLE,
          inventory_strategy: InventoryStrategy.AVERAGE,
        }),
      );
    });

    it('crea producto con base_price 0 si no se especifica', async () => {
      await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '12345678', measurement_unit: 'ltr' },
      ], 'org-1');
      expect(mockProductRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ base_price: 0 }),
      );
    });

    it('crea producto con organization_id correcto', async () => {
      await service._importRows([
        { row: 2, name: 'Producto', sku: 'SKU-1', code: '12345678', measurement_unit: 'ltr' },
      ], 'org-custom');
      expect(mockProductRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organization_id: 'org-custom' }),
      );
    });

    it('importa múltiples productos y reporta el resumen correcto', async () => {
      const rows = [
        { row: 2, name: 'Prod A', sku: 'SKU-A', code: '12345678', measurement_unit: 'ltr' },
        { row: 3, name: 'Prod B', sku: 'SKU-B', code: '87654321', measurement_unit: 'ltr' },
        { row: 4, name: '', sku: 'SKU-C', code: '11111111', measurement_unit: 'ltr' }, // error
      ];
      const result = await service._importRows(rows, 'org-1');
      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.summary).toContain('2 creados');
    });
  });
});
