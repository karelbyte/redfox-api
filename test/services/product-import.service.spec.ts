import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ProductImportService, ImportProductRow, ImportResult } from '../../src/services/product-import.service';
import { Product, ProductType, InventoryStrategy } from '../../src/models/product.entity';
import { Brand } from '../../src/models/brand.entity';
import { Category } from '../../src/models/category.entity';
import { MeasurementUnit } from '../../src/models/measurement-unit.entity';
import { Tax } from '../../src/models/tax.entity';
import { TenantContext } from '../../src/services/tenant-context.service';

describe('ProductImportService', () => {
  let service: ProductImportService;
  let productRepo: jest.Mocked<Repository<Product>>;
  let brandRepo: jest.Mocked<Repository<Brand>>;
  let categoryRepo: jest.Mocked<Repository<Category>>;
  let measurementUnitRepo: jest.Mocked<Repository<MeasurementUnit>>;
  let taxRepo: jest.Mocked<Repository<Tax>>;
  let tenantContext: jest.Mocked<TenantContext>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repositories
    productRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;

    brandRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    categoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    measurementUnitRepo = {
      find: jest.fn(),
    } as any;

    taxRepo = {
      find: jest.fn(),
    } as any;

    // Mock services
    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    } as any;

    // Create service instance
    service = new ProductImportService(
      productRepo,
      brandRepo,
      categoryRepo,
      measurementUnitRepo,
      taxRepo,
      tenantContext,
    );
  });

  describe('parseCSV', () => {
    it('should parse CSV with comma separator', () => {
      const csvContent = 'name,sku,code,base_price,measurement_unit\nTest Product,SKU001,12345678,100.50,PIEZA';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        name: 'Test Product',
        sku: 'SKU001',
        code: '12345678',
        base_price: 100.5,
        measurement_unit: 'PIEZA',
        type: 'tangible',
        inventory_strategy: 'average',
        description: '',
        brand: '',
        category: '',
        tax: '',
        iva16: undefined,
        barcode: '',
        min_stock: undefined,
        weight: undefined,
        width: undefined,
        height: undefined,
        length: undefined,
      });
    });

    it('should parse CSV with semicolon separator', () => {
      const csvContent = 'name;sku;code;measurement_unit\nTest Product;SKU001;12345678;PIEZA';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        name: 'Test Product',
        sku: 'SKU001',
        code: '12345678',
        base_price: undefined,
        measurement_unit: 'PIEZA',
        type: 'tangible',
        inventory_strategy: 'average',
        description: '',
        brand: '',
        category: '',
        tax: '',
        iva16: undefined,
        barcode: '',
        min_stock: undefined,
        weight: undefined,
        width: undefined,
        height: undefined,
        length: undefined,
      });
    });

    it('should map Spanish headers correctly', () => {
      const csvContent = 'nombre,sku,codigo_sat,precio_base,unidad_medida\nProducto Test,SKU001,12345678,100.50,PIEZA';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        name: 'Producto Test',
        sku: 'SKU001',
        code: '12345678',
        base_price: 100.5,
        measurement_unit: 'PIEZA',
        type: 'tangible',
        inventory_strategy: 'average',
        description: '',
        brand: '',
        category: '',
        tax: '',
        iva16: undefined,
        barcode: '',
        min_stock: undefined,
        weight: undefined,
        width: undefined,
        height: undefined,
        length: undefined,
      });
    });

    it('should handle quoted fields', () => {
      const csvContent = 'name,description\n"Product, Inc","Test product with comma in name"';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        name: 'Product, Inc',
        description: 'Test product with comma in name',
        sku: '',
        code: '',
        type: 'tangible',
        inventory_strategy: 'average',
        measurement_unit: '',
        base_price: undefined,
        brand: '',
        category: '',
        tax: '',
        iva16: undefined,
        barcode: '',
        min_stock: undefined,
        weight: undefined,
        width: undefined,
        height: undefined,
        length: undefined,
      });
    });

    it('should include all optional fields', () => {
      const csvContent = 'name,sku,code,base_price,type,inventory_strategy,brand,category,measurement_unit,tax,iva16,barcode,min_stock,weight,width,height,length\nTest Product,SKU001,12345678,100.50,service,fifo,Test Brand,Test Category,PIEZA,IVA,1,BARCODE123,5,1.5,2.0,3.0,4.0';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        name: 'Test Product',
        sku: 'SKU001',
        code: '12345678',
        base_price: 100.50,
        type: 'service',
        inventory_strategy: 'fifo',
        brand: 'Test Brand',
        category: 'Test Category',
        measurement_unit: 'PIEZA',
        tax: 'IVA',
        iva16: 1,
        barcode: 'BARCODE123',
        min_stock: 5,
        weight: 1.5,
        width: 2.0,
        height: 3.0,
        length: 4.0,
        description: '',
      });
    });

    it('should skip metadata rows', () => {
      const csvContent = 'name,sku\ntipo:campo\nTest Product,SKU001';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 3,
        name: 'Test Product',
        sku: 'SKU001',
        code: '',
        type: 'tangible',
        inventory_strategy: 'average',
        measurement_unit: '',
        description: '',
        brand: '',
        category: '',
        tax: '',
        iva16: undefined,
        barcode: '',
        min_stock: undefined,
        weight: undefined,
        width: undefined,
        height: undefined,
        length: undefined,
      });
    });

    it('should throw error for empty or insufficient data', () => {
      const emptyBuffer = Buffer.from('', 'utf-8');
      const headerOnlyBuffer = Buffer.from('name,sku\n', 'utf-8');

      expect(() => service.parseCSV(emptyBuffer)).toThrow(BadRequestException);
      expect(() => service.parseCSV(headerOnlyBuffer)).toThrow(BadRequestException);
    });

    it('should handle different line endings', () => {
      const csvContent = 'name,sku\r\nTest Product,SKU001\r\nAnother Product,SKU002';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(2);
    });
  });

  describe('generateSlug', () => {
    it('should generate slug from name', () => {
      const slug = (service as any).generateSlug('Test Product Name');
      expect(slug).toBe('test-product-name');
    });

    it('should handle special characters', () => {
      const slug = (service as any).generateSlug('Producto con Ñ y áéíóú');
      expect(slug).toBe('producto-con-n-y-aeiou');
    });

    it('should limit slug length', () => {
      const longName = 'A'.repeat(150);
      const slug = (service as any).generateSlug(longName);
      expect(slug.length).toBeLessThanOrEqual(100);
    });
  });

  describe('ensureUniqueSlug', () => {
    it('should return original slug if not exists', async () => {
      productRepo.findOne.mockResolvedValue(null);

      const slug = await (service as any).ensureUniqueSlug('test-product');

      expect(slug).toBe('test-product');
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-product', organization_id: 'org-123' },
      });
    });

    it('should append number if slug exists', async () => {
      productRepo.findOne
        .mockResolvedValueOnce({ id: '1' } as any) // Original slug exists
        .mockResolvedValueOnce(null); // Modified slug doesn't exist

      const slug = await (service as any).ensureUniqueSlug('test-product');

      expect(slug).toBe('test-product-1');
      expect(productRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it('should increment number until unique slug found', async () => {
      productRepo.findOne
        .mockResolvedValueOnce({ id: '1' } as any) // test-product exists
        .mockResolvedValueOnce({ id: '2' } as any) // test-product-1 exists
        .mockResolvedValueOnce(null); // test-product-2 doesn't exist

      const slug = await (service as any).ensureUniqueSlug('test-product');

      expect(slug).toBe('test-product-2');
      expect(productRepo.findOne).toHaveBeenCalledTimes(3);
    });
  });

  describe('importRows', () => {
    const mockProduct = {
      id: 'product-1',
      name: 'Test Product',
      sku: 'SKU001',
      code: '12345678',
    };

    const mockBrand = {
      id: 'brand-1',
      code: 'test-brand',
      description: 'Test Brand',
    };

    const mockCategory = {
      id: 'category-1',
      name: 'Test Category',
      slug: 'test-category',
    };

    const mockUnit = {
      id: 'unit-1',
      code: 'PIEZA',
      name: 'Pieza',
    };

    const mockTax = {
      id: 'tax-1',
      code: 'IVA',
      name: 'IVA',
      value: 16,
    };

    it('should import valid rows successfully', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // Mock product checks
      productRepo.findOne.mockResolvedValue(null);
      productRepo.create.mockReturnValue(mockProduct as any);
      productRepo.save.mockResolvedValue(mockProduct as any);

      // Mock slug generation
      jest.spyOn(service as any, 'ensureUniqueSlugForOrg').mockResolvedValue('test-product');

      const result = await service.importRows(rows);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.skipped).toBe(0);
      expect(result.summary).toContain('1 creados');
    });

    it('should handle missing required fields', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: '',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
        },
        {
          row: 2,
          name: 'Test Product',
          sku: '',
          code: '12345678',
          measurement_unit: 'PIEZA',
        },
        {
          row: 3,
          name: 'Test Product',
          sku: 'SKU001',
          code: '123', // Too short
          measurement_unit: 'PIEZA',
        },
        {
          row: 4,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: '', // Missing
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(4);
      expect(result.errors[0].reason).toContain('El campo "name" es requerido');
      expect(result.errors[1].reason).toContain('El campo "sku" es requerido');
      expect(result.errors[2].reason).toContain('El campo "code" (código SAT) es requerido');
      expect(result.errors[3].reason).toContain('El campo "measurement_unit" es requerido');
    });

    it('should skip duplicate SKUs', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // Mock existing product
      productRepo.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('ya existe — omitido para evitar duplicado');
    });

    it('should fail when measurement unit not found', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'UNKNOWN_UNIT',
        },
      ];

      // Mock empty catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([]);
      taxRepo.find.mockResolvedValue([]);

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('Unidad de medida "UNKNOWN_UNIT" no encontrada');
    });

    it('should create brand automatically if not exists', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
          brand: 'New Brand',
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // Mock product checks
      productRepo.findOne.mockResolvedValue(null);
      productRepo.create.mockReturnValue(mockProduct as any);
      productRepo.save.mockResolvedValue(mockProduct as any);

      // Mock brand creation
      brandRepo.create.mockReturnValue(mockBrand as any);
      brandRepo.save.mockResolvedValue(mockBrand as any);

      // Mock slug generation
      jest.spyOn(service as any, 'ensureUniqueSlugForOrg').mockResolvedValue('test-product');

      const result = await service.importRows(rows);

      expect(result.created).toBe(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual({
        row: 1,
        sku: 'SKU001',
        name: 'Test Product',
        field: 'brand',
        reason: 'Marca "New Brand" creada automáticamente.',
      });
      expect(brandRepo.create).toHaveBeenCalledWith({
        code: 'new-brand',
        description: 'New Brand',
        organization_id: 'org-123',
        isActive: true,
      });
    });

    it('should create category automatically if not exists', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
          category: 'New Category',
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // Mock product checks
      productRepo.findOne.mockResolvedValue(null);
      productRepo.create.mockReturnValue(mockProduct as any);
      productRepo.save.mockResolvedValue(mockProduct as any);

      // Mock category creation
      categoryRepo.create.mockReturnValue(mockCategory as any);
      categoryRepo.save.mockResolvedValue(mockCategory as any);

      // Mock slug generation
      jest.spyOn(service as any, 'ensureUniqueSlugForCategory').mockResolvedValue('new-category');

      const result = await service.importRows(rows);

      expect(result.created).toBe(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual({
        row: 1,
        sku: 'SKU001',
        name: 'Test Product',
        field: 'category',
        reason: 'Categoría "New Category" creada automáticamente.',
      });
      expect(categoryRepo.create).toHaveBeenCalledWith({
        name: 'New Category',
        slug: 'new-category',
        description: 'New Category',
        organization_id: 'org-123',
        isActive: true,
        position: 0,
      });
    });

    it('should handle tax assignment and warnings', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
          tax: 'UNKNOWN_TAX',
        },
        {
          row: 2,
          name: 'Test Product 2',
          sku: 'SKU002',
          code: '12345679',
          measurement_unit: 'PIEZA',
          iva16: 1,
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([mockTax as any]);

      // Mock product checks
      productRepo.findOne.mockResolvedValue(null);
      productRepo.create.mockReturnValue(mockProduct as any);
      productRepo.save.mockResolvedValue(mockProduct as any);

      // Mock slug generation
      jest.spyOn(service as any, 'ensureUniqueSlugForOrg').mockResolvedValue('test-product');

      const result = await service.importRows(rows);

      expect(result.created).toBe(2);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toEqual({
        row: 1,
        sku: 'SKU001',
        name: 'Test Product',
        field: 'tax',
        reason: 'Impuesto "UNKNOWN_TAX" no encontrado — el producto se creó sin impuesto. Créalo en Productos > Impuestos.',
      });
      expect(result.warnings[1]).toEqual({
        row: 2,
        sku: 'SKU002',
        name: 'Test Product 2',
        field: 'iva16',
        reason: 'IVA 16% asignado automáticamente al producto.',
      });
    });

    it('should handle type and inventory_strategy validation', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
          type: 'service',
          inventory_strategy: 'fifo',
        },
        {
          row: 2,
          name: 'Test Product 2',
          sku: 'SKU002',
          code: '12345679',
          measurement_unit: 'PIEZA',
          type: 'INVALID_TYPE',
          inventory_strategy: 'INVALID_STRATEGY',
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // Mock product checks
      productRepo.findOne.mockResolvedValue(null);
      productRepo.create.mockReturnValue(mockProduct as any);
      productRepo.save.mockResolvedValue(mockProduct as any);

      // Mock slug generation
      jest.spyOn(service as any, 'ensureUniqueSlugForOrg').mockResolvedValue('test-product');

      const result = await service.importRows(rows);

      expect(result.created).toBe(2);
      expect(productRepo.create).toHaveBeenCalledTimes(2);
      
      // First product - valid types
      expect(productRepo.create).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          type: ProductType.SERVICE,
          inventory_strategy: InventoryStrategy.FIFO,
        })
      );
      
      // Second product - invalid types, should default
      expect(productRepo.create).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          type: ProductType.TANGIBLE,
          inventory_strategy: InventoryStrategy.AVERAGE,
        })
      );
    });

    it('should handle numeric field validation', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
          base_price: 'invalid_price' as any,
          min_stock: 'invalid_stock' as any,
          weight: 'invalid_weight' as any,
          width: 'invalid_width' as any,
          height: 'invalid_height' as any,
          length: 'invalid_length' as any,
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // Mock product checks
      productRepo.findOne.mockResolvedValue(null);
      productRepo.create.mockReturnValue(mockProduct as any);
      productRepo.save.mockResolvedValue(mockProduct as any);

      // Mock slug generation
      jest.spyOn(service as any, 'ensureUniqueSlugForOrg').mockResolvedValue('test-product');

      const result = await service.importRows(rows);

      expect(result.created).toBe(1);
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          base_price: 0, // Invalid number becomes 0
          min_stock: 0, // Invalid number becomes 0
          weight: 'invalid_weight', // Invalid string stays as string
          width: 'invalid_width',
          height: 'invalid_height',
          length: 'invalid_length',
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // Mock database error
      productRepo.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        row: 1,
        sku: 'SKU001',
        name: 'Test Product',
        reason: 'Database error',
      });
    });

    it('should use override organization ID when provided', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
        },
      ];

      // Mock catalog data with override org
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // Mock product checks
      productRepo.findOne.mockResolvedValue(null);
      productRepo.create.mockReturnValue(mockProduct as any);
      productRepo.save.mockResolvedValue(mockProduct as any);

      // Mock slug generation
      jest.spyOn(service as any, 'ensureUniqueSlugForOrg').mockResolvedValue('test-product');

      await service.importRowsWithOrg(rows, 'override-org-456');

      expect(brandRepo.find).toHaveBeenCalledWith({ where: { organization_id: 'override-org-456' } });
      expect(categoryRepo.find).toHaveBeenCalledWith({ where: { organization_id: 'override-org-456' } });
      expect(measurementUnitRepo.find).toHaveBeenCalledWith({ where: { organization_id: 'override-org-456' } });
      expect(taxRepo.find).toHaveBeenCalledWith({ where: { organization_id: 'override-org-456' } });
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'override-org-456',
        })
      );
    });

    it('should generate comprehensive summary', async () => {
      const rows: ImportProductRow[] = [
        {
          row: 1,
          name: 'Test Product',
          sku: 'SKU001',
          code: '12345678',
          measurement_unit: 'PIEZA',
        },
        {
          row: 2,
          name: 'Test Product 2',
          sku: 'SKU002', // Will be skipped as duplicate
          code: '12345679',
          measurement_unit: 'PIEZA',
        },
      ];

      // Mock catalog data
      brandRepo.find.mockResolvedValue([]);
      categoryRepo.find.mockResolvedValue([]);
      measurementUnitRepo.find.mockResolvedValue([mockUnit as any]);
      taxRepo.find.mockResolvedValue([]);

      // First row - success
      productRepo.findOne.mockResolvedValueOnce(null);
      productRepo.create.mockReturnValue(mockProduct as any);
      productRepo.save.mockResolvedValue(mockProduct as any);

      // Second row - duplicate
      productRepo.findOne.mockResolvedValueOnce(mockProduct as any);

      // Mock slug generation
      jest.spyOn(service as any, 'ensureUniqueSlugForOrg').mockResolvedValue('test-product');

      const result = await service.importRows(rows);

      expect(result.summary).toBe(
        'Importación completada: 1 creados, 1 omitidos (duplicados), 1 errores, 0 advertencias.'
      );
    });
  });

  describe('organizationId getter', () => {
    it('should return organization ID from tenant context', () => {
      const orgId = (service as any).organizationId;
      expect(orgId).toBe('org-123');
      expect(tenantContext.getOrganizationId).toHaveBeenCalled();
    });
  });
});
