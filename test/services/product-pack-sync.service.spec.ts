import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductPackSyncService } from '../../src/services/product-pack-sync.service';
import { Product } from '../../src/models/product.entity';
import { CertificationPackFactoryService } from '../../src/services/certification-pack-factory.service';

describe('ProductPackSyncService', () => {
  let service: ProductPackSyncService;
  let productRepository: jest.Mocked<Repository<Product>>;
  let certificationPackFactory: jest.Mocked<CertificationPackFactoryService>;
  let packService: jest.Mocked<any>;

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test product description',
    sku: 'SKU001',
    code: '50161800',
    base_price: 100.50,
    taxes: [{ code: 'IVA', value: 16 }],
    is_active: true,
    product_pack_id: null,
    pack_payload: null,
  } as any;

  const mockPackResponse = {
    id: 'pack-product-123',
    payload_send: { description: 'Test Product', price: 100.50 },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    productRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;

    packService = {
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      findProductBySku: jest.fn(),
    } as any;

    certificationPackFactory = {
      getPackService: jest.fn().mockResolvedValue(packService),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductPackSyncService,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
        {
          provide: CertificationPackFactoryService,
          useValue: certificationPackFactory,
        },
      ],
    }).compile();

    service = module.get<ProductPackSyncService>(ProductPackSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncProduct', () => {
    it('should create new product when no pack_id exists', async () => {
      packService.findProductBySku.mockResolvedValue(null);
      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);

      const result = await service.syncProduct(mockProduct);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createProduct).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalled();
    });

    it('should update existing product when pack_id exists', async () => {
      const productWithPackId = { ...mockProduct, product_pack_id: 'existing-pack-id' };
      packService.findProductBySku.mockResolvedValue({ id: 'existing-pack-id' });
      packService.updateProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(productWithPackId as any);

      const result = await service.syncProduct(productWithPackId);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.updateProduct).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalled();
    });

    it('should handle pack service errors gracefully', async () => {
      certificationPackFactory.getPackService.mockRejectedValue(new Error('No pack configured'));

      const result = await service.syncProduct(mockProduct);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe('No certification pack configured');
      expect(productRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('syncProducts', () => {
    it('should sync multiple products successfully', async () => {
      const products = [mockProduct, { ...mockProduct, id: 'product-2' }];
      
      packService.findProductBySku.mockResolvedValue(null);
      packService.createProduct.mockResolvedValue(mockPackResponse);
      productRepository.save.mockResolvedValue(mockProduct as any);

      const result = await service.syncProducts(products);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed success and failure', async () => {
      const products = [mockProduct, { ...mockProduct, id: 'product-2' }];
      
      // First product succeeds
      packService.findProductBySku.mockResolvedValueOnce(null);
      packService.createProduct.mockResolvedValueOnce(mockPackResponse);
      
      // Second product fails
      certificationPackFactory.getPackService.mockRejectedValueOnce(new Error('No pack configured'));
      
      productRepository.save.mockResolvedValue(mockProduct as any);

      const result = await service.syncProducts(products);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle empty product list', async () => {
      const result = await service.syncProducts([]);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
