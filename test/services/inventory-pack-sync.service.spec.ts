import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { InventoryPackSyncService } from '../../src/services/inventory-pack-sync.service';
import { Inventory } from '../../src/models/inventory.entity';
import { Product } from '../../src/models/product.entity';
import { CertificationPackFactoryService } from '../../src/services/certification-pack-factory.service';
import { ICertificationPackService, ProductResponse } from '../../src/interfaces/certification-pack.interface';
import { MeasurementUnit } from '../../src/models/measurement-unit.entity';
import { Tax } from '../../src/models/tax.entity';

describe('InventoryPackSyncService', () => {
  let service: InventoryPackSyncService;
  let inventoryRepository: jest.Mocked<Repository<Inventory>>;
  let productRepository: jest.Mocked<Repository<Product>>;
  let certificationPackFactory: jest.Mocked<CertificationPackFactoryService>;
  let packService: jest.Mocked<ICertificationPackService>;
  let logger: jest.Mocked<Logger>;

  const mockMeasurementUnit = {
    id: 'unit-1',
    code: 'H87',
    description: 'Elemento',
  };

  const mockTax = {
    id: 'tax-1',
    code: 'IVA',
    name: 'IVA',
    value: 16,
  };

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test product description',
    sku: 'SKU001',
    code: '50161800',
    base_price: 100.50,
    type: 'tangible',
    product_pack_id: null,
    pack_payload: null,
    measurement_unit: mockMeasurementUnit,
    taxes: [mockTax],
    organization_id: 'org-123',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const mockProductWithPackId = {
    ...mockProduct,
    id: 'product-2',
    product_pack_id: 'pack-product-123',
    pack_payload: {
      description: 'Test Product',
      product_key: '50161800',
      unit_key: 'H87',
      price: 100.50,
      sku: 'SKU001',
    },
  } as any;

  const mockInventory = {
    id: 'inventory-1',
    product: mockProduct,
    price: 120.00,
    pack_product_id: null,
    pack_product_response: null,
    quantity: 10,
    organization_id: 'org-123',
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const mockInventoryWithPackId = {
    ...mockInventory,
    id: 'inventory-2',
    product: mockProductWithPackId,
    pack_product_id: 'pack-product-123',
  } as any;

  const mockPackResponse = {
    id: 'pack-product-123',
    uuid: 'uuid-123',
    description: 'Test Product',
    product_key: '50161800',
    unit_key: 'H87',
    price: 120.00,
  } as any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repositories
    inventoryRepository = {
      save: jest.fn(),
    } as any;

    productRepository = {
      save: jest.fn(),
    } as any;

    // Mock pack service
    packService = {
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
    } as any;

    // Mock factory
    certificationPackFactory = {
      getPackService: jest.fn().mockResolvedValue(packService),
    } as any;

    // Mock logger
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Create service instance
    service = new InventoryPackSyncService(
      inventoryRepository,
      productRepository,
      certificationPackFactory,
    );

    // Override logger
    (service as any).logger = logger;
  });

  describe('buildProductData', () => {
    it('should build product data correctly', () => {
      const price = 120.00;
      const productData = (service as any).buildProductData(mockProduct, price);

      expect(productData).toEqual({
        description: 'Test product description',
        product_key: '50161800',
        unit_key: 'H87',
        unit_name: 'Elemento',
        price: 120.00,
        tax_included: true,
        taxability: '02',
        taxes: [{ type: 'IVA', rate: 0.16 }],
        sku: 'SKU001',
      });
    });

    it('should use default values when measurement unit is missing', () => {
      const productWithoutUnit = {
        ...mockProduct,
        measurement_unit: undefined,
      };

      const productData = (service as any).buildProductData(productWithoutUnit, 100);

      expect(productData.unit_key).toBe('H87');
      expect(productData.unit_name).toBe('Elemento');
    });

    it('should use default tax when product has no taxes', () => {
      const productWithoutTaxes = {
        ...mockProduct,
        taxes: undefined,
      };

      const productData = (service as any).buildProductData(productWithoutTaxes, 100);

      expect(productData.taxes).toEqual([{ type: 'IVA', rate: 0.16 }]);
    });

    it('should use name when description is missing', () => {
      const productWithoutDescription = {
        ...mockProduct,
        description: '',
      };

      const productData = (service as any).buildProductData(productWithoutDescription, 100);

      expect(productData.description).toBe('Test Product');
    });

    it('should use default product key when code is missing', () => {
      const productWithoutCode = {
        ...mockProduct,
        code: '',
      };

      const productData = (service as any).buildProductData(productWithoutCode, 100);

      expect(productData.product_key).toBe('50161800');
    });

    it('should handle multiple taxes correctly', () => {
      const productWithMultipleTaxes = {
        ...mockProduct,
        taxes: [
          { name: 'IVA', value: 16 },
          { name: 'IEPS', value: 8 },
        ],
      };

      const productData = (service as any).buildProductData(productWithMultipleTaxes, 100);

      expect(productData.taxes).toEqual([
        { type: 'IVA', rate: 0.16 },
        { type: 'IEPS', rate: 0.08 },
      ]);
    });

    it('should omit SKU when not present', () => {
      const productWithoutSku = {
        ...mockProduct,
        sku: null,
      };

      const productData = (service as any).buildProductData(productWithoutSku, 100);

      expect(productData.sku).toBeUndefined();
    });
  });

  describe('hasPayloadChanged', () => {
    it('should return true when stored payload is null', () => {
      const result = (service as any).hasPayloadChanged(null, {
        description: 'Test',
        product_key: '123',
        unit_key: 'H87',
        price: 100,
        sku: 'SKU001',
      });

      expect(result).toBe(true);
    });

    it('should return true when stored payload is undefined', () => {
      const result = (service as any).hasPayloadChanged(undefined, {
        description: 'Test',
        product_key: '123',
        unit_key: 'H87',
        price: 100,
        sku: 'SKU001',
      });

      expect(result).toBe(true);
    });

    it('should return true when payloads differ', () => {
      const storedPayload = {
        description: 'Old Description',
        product_key: '123',
        unit_key: 'H87',
        price: 100,
        sku: 'SKU001',
      };

      const newPayload = {
        description: 'New Description',
        product_key: '123',
        unit_key: 'H87',
        price: 100,
        sku: 'SKU001',
      };

      const result = (service as any).hasPayloadChanged(storedPayload, newPayload);

      expect(result).toBe(true);
    });

    it('should return false when payloads are identical', () => {
      const storedPayload = {
        description: 'Test',
        product_key: '123',
        unit_key: 'H87',
        price: 100,
        sku: 'SKU001',
      };

      const newPayload = {
        description: 'Test',
        product_key: '123',
        unit_key: 'H87',
        price: 100,
        sku: 'SKU001',
      };

      const result = (service as any).hasPayloadChanged(storedPayload, newPayload);

      expect(result).toBe(false);
    });

    it('should handle missing fields gracefully', () => {
      const storedPayload = {
        description: 'Test',
        product_key: '123',
        unit_key: 'H87',
        price: 100,
        sku: null,
      };

      const newPayload = {
        description: 'Test',
        product_key: '123',
        unit_key: 'H87',
        price: 100,
        sku: undefined,
      };

      const result = (service as any).hasPayloadChanged(storedPayload, newPayload);

      expect(result).toBe(false);
    });

    it('should normalize numeric values for comparison', () => {
      const storedPayload = {
        description: 'Test',
        product_key: '123',
        unit_key: 'H87',
        price: '100',
        sku: 'SKU001',
      };

      const newPayload = {
        description: 'Test',
        product_key: 123,
        unit_key: 'H87',
        price: 100,
        sku: 'SKU001',
      };

      const result = (service as any).hasPayloadChanged(storedPayload, newPayload);

      expect(result).toBe(false);
    });
  });

  describe('syncForInventory', () => {
    it('should create new product when no pack_product_id exists', async () => {
      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);
      inventoryRepository.save.mockResolvedValue(mockInventory as any);

      const result = await service.syncForInventory(mockInventory);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test product description',
          product_key: '50161800',
          price: 120.00,
          tax_included: true,
        })
      );
      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          product_pack_id: mockPackResponse.id,
          pack_payload: expect.any(Object),
        })
      );
      expect(inventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_product_id: mockPackResponse.id,
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('No pack_product_id for product'),
      );
    });

    it('should update existing product when payload has changed', async () => {
      const inventoryWithChangedPayload = {
        ...mockInventoryWithPackId,
        product: {
          ...mockProductWithPackId,
          pack_payload: {
            description: 'Old Description',
            product_key: '50161800',
            unit_key: 'H87',
            price: 100.00,
            sku: 'SKU001',
          },
        },
      };

      packService.updateProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProductWithPackId as any);
      inventoryRepository.save.mockResolvedValue(mockInventoryWithPackId as any);

      const result = await service.syncForInventory(inventoryWithChangedPayload);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.updateProduct).toHaveBeenCalledWith(
        'pack-product-123',
        expect.objectContaining({
          description: 'Test product description',
          price: 120.00,
        })
      );
      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_payload: expect.any(Object),
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Payload changed for product'),
      );
    });

    it('should skip update when payload has not changed', async () => {
      const inventoryWithUnchangedPayload = {
        ...mockInventoryWithPackId,
        product: {
          ...mockProductWithPackId,
          pack_payload: {
            description: 'Test product description',
            product_key: '50161800',
            unit_key: 'H87',
            price: 120.00,
            sku: 'SKU001',
          },
        },
      };

      inventoryRepository.save.mockResolvedValue(mockInventoryWithPackId as any);

      const result = await service.syncForInventory(inventoryWithUnchangedPayload);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.updateProduct).not.toHaveBeenCalled();
      expect(productRepository.save).not.toHaveBeenCalled();
      expect(inventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_product_id: 'pack-product-123',
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('No changes detected for product'),
      );
    });

    it('should handle inventory with no product', async () => {
      const inventoryWithoutProduct = {
        ...mockInventory,
        product: null,
      };

      const result = await service.syncForInventory(inventoryWithoutProduct);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe('Inventory product not loaded');
      expect(packService.createProduct).not.toHaveBeenCalled();
      expect(packService.updateProduct).not.toHaveBeenCalled();
    });

    it('should handle pack service errors gracefully', async () => {
      const errorMessage = 'Pack service error';
      packService.createProduct.mockRejectedValue(new Error(errorMessage));

      const result = await service.syncForInventory(mockInventory);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe(errorMessage);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync inventory with certification pack'),
      );
    });

    it('should handle zero price inventory', async () => {
      const inventoryWithZeroPrice = {
        ...mockInventory,
        price: 0,
      };

      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);
      inventoryRepository.save.mockResolvedValue(inventoryWithZeroPrice as any);

      const result = await service.syncForInventory(inventoryWithZeroPrice);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 0,
        })
      );
    });

    it('should handle null price inventory', async () => {
      const inventoryWithNullPrice = {
        ...mockInventory,
        price: null,
      };

      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);
      inventoryRepository.save.mockResolvedValue(inventoryWithNullPrice as any);

      const result = await service.syncForInventory(inventoryWithNullPrice);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 0,
        })
      );
    });

    it('should preserve inventory response from pack', async () => {
      const packResponseWithExtra = {
        ...mockPackResponse,
        extra_field: 'extra_value',
      };

      packService.createProduct.mockResolvedValue(packResponseWithExtra);
      productRepository.save.mockResolvedValue(mockProduct as any);
      inventoryRepository.save.mockResolvedValue(mockInventory as any);

      const result = await service.syncForInventory(mockInventory);

      expect(result.packSyncSuccess).toBe(true);
      expect(inventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_product_response: packResponseWithExtra,
        })
      );
    });

    it('should handle update response from pack', async () => {
      const inventoryWithChangedPayload = {
        ...mockInventoryWithPackId,
        product: {
          ...mockProductWithPackId,
          pack_payload: {
            description: 'Old Description',
            product_key: '50161800',
            unit_key: 'H87',
            price: 100.00,
            sku: 'SKU001',
          },
        },
      };

      const updateResponse = {
        ...mockPackResponse,
        updated_at: new Date(),
      };

      packService.updateProduct.mockResolvedValue(updateResponse);
      productRepository.save.mockResolvedValue(mockProductWithPackId as any);
      inventoryRepository.save.mockResolvedValue(mockInventoryWithPackId as any);

      const result = await service.syncForInventory(inventoryWithChangedPayload);

      expect(result.packSyncSuccess).toBe(true);
      expect(inventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_product_response: updateResponse,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle null error message gracefully', async () => {
      const error = new Error();
      error.message = undefined as any;
      packService.createProduct.mockRejectedValue(error);

      const result = await service.syncForInventory(mockInventory);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBeUndefined();
    });

    it('should handle error with stack trace', async () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      packService.createProduct.mockRejectedValue(error);

      const result = await service.syncForInventory(mockInventory);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe('Test error');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync inventory with certification pack'),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle product without SKU', async () => {
      const inventoryWithoutSku = {
        ...mockInventory,
        product: {
          ...mockProduct,
          sku: null,
        },
      };

      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);
      inventoryRepository.save.mockResolvedValue(inventoryWithoutSku as any);

      const result = await service.syncForInventory(inventoryWithoutSku);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: undefined,
        })
      );
    });

    it('should handle product without taxes', async () => {
      const inventoryWithoutTaxes = {
        ...mockInventory,
        product: {
          ...mockProduct,
          taxes: [],
        },
      };

      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);
      inventoryRepository.save.mockResolvedValue(inventoryWithoutTaxes as any);

      const result = await service.syncForInventory(inventoryWithoutTaxes);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          taxes: [], // El servicio no aplica default tax cuando taxes es []
        })
      );
    });

    it('should handle product without measurement unit', async () => {
      const inventoryWithoutUnit = {
        ...mockInventory,
        product: {
          ...mockProduct,
          measurement_unit: undefined,
        },
      };

      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);
      inventoryRepository.save.mockResolvedValue(inventoryWithoutUnit as any);

      const result = await service.syncForInventory(inventoryWithoutUnit);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_key: 'H87',
          unit_name: 'Elemento',
        })
      );
    });

    it('should handle product without description and name', async () => {
      const inventoryWithoutDescription = {
        ...mockInventory,
        product: {
          ...mockProduct,
          name: '',
          description: '',
        },
      };

      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);
      inventoryRepository.save.mockResolvedValue(inventoryWithoutDescription as any);

      const result = await service.syncForInventory(inventoryWithoutDescription);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '',
        })
      );
    });
  });
});
