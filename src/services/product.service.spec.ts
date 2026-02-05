import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductService } from './product.service';
import { Product } from '../models/product.entity';
import { Category } from '../models/category.entity';
import { Brand } from '../models/brand.entity';
import { createMockRepository, createTestProduct } from '../../test/test-utils';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: jest.Mocked<Repository<Product>>;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let brandRepository: jest.Mocked<Repository<Brand>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Category),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Brand),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(getRepositoryToken(Product));
    categoryRepository = module.get(getRepositoryToken(Category));
    brandRepository = module.get(getRepositoryToken(Brand));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product successfully', async () => {
      // Arrange
      const productData = createTestProduct();
      const savedProduct = { id: 1, ...productData };

      productRepository.create.mockReturnValue(savedProduct as Product);
      productRepository.save.mockResolvedValue(savedProduct as Product);

      // Act
      const result = await service.create(productData as any);

      // Assert
      expect(productRepository.create).toHaveBeenCalledWith(productData);
      expect(productRepository.save).toHaveBeenCalledWith(savedProduct);
      expect(result).toEqual(savedProduct);
    });

    it('should throw error if barcode already exists', async () => {
      // Arrange
      const productData = createTestProduct();
      productRepository.findOneBy.mockResolvedValue({ id: 1 } as Product);

      // Act & Assert
      await expect(service.create(productData as any)).rejects.toThrow('Barcode already exists');
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      // Arrange
      const products = [
        { id: 1, ...createTestProduct() },
        { id: 2, ...createTestProduct({ name: 'Product 2' }) },
      ];
      const total = 2;

      productRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([products, total]),
      } as any);

      // Act
      const result = await service.findAll(1, 10);

      // Assert
      expect(result).toEqual({
        data: products,
        total,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter products by search term', async () => {
      // Arrange
      const searchTerm = 'Test';
      const products = [{ id: 1, ...createTestProduct() }];
      const total = 1;

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([products, total]),
      };

      productRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.findAll(1, 10, searchTerm);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.name LIKE :search OR product.description LIKE :search OR product.barcode LIKE :search)',
        { search: `%${searchTerm}%` }
      );
      expect(result.data).toEqual(products);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      // Arrange
      const productId = 1;
      const product = { id: productId, ...createTestProduct() };
      productRepository.findOne.mockResolvedValue(product as Product);

      // Act
      const result = await service.findById(productId);

      // Assert
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId },
        relations: ['category', 'brand', 'measurementUnit'],
      });
      expect(result).toEqual(product);
    });

    it('should return null when product not found', async () => {
      // Arrange
      const productId = 999;
      productRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById(productId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateStock', () => {
    it('should update product stock successfully', async () => {
      // Arrange
      const productId = 1;
      const quantity = 5;
      const operation = 'add';
      const existingProduct = { id: productId, stock: 10, ...createTestProduct() };
      const updatedProduct = { ...existingProduct, stock: 15 };

      productRepository.findOneBy.mockResolvedValue(existingProduct as Product);
      productRepository.save.mockResolvedValue(updatedProduct as Product);

      // Act
      const result = await service.updateStock(productId, quantity, operation);

      // Assert
      expect(productRepository.findOneBy).toHaveBeenCalledWith({ id: productId });
      expect(productRepository.save).toHaveBeenCalledWith(updatedProduct);
      expect(result.stock).toBe(15);
    });

    it('should subtract stock correctly', async () => {
      // Arrange
      const productId = 1;
      const quantity = 3;
      const operation = 'subtract';
      const existingProduct = { id: productId, stock: 10, ...createTestProduct() };
      const updatedProduct = { ...existingProduct, stock: 7 };

      productRepository.findOneBy.mockResolvedValue(existingProduct as Product);
      productRepository.save.mockResolvedValue(updatedProduct as Product);

      // Act
      const result = await service.updateStock(productId, quantity, operation);

      // Assert
      expect(result.stock).toBe(7);
    });

    it('should throw error if insufficient stock', async () => {
      // Arrange
      const productId = 1;
      const quantity = 15;
      const operation = 'subtract';
      const existingProduct = { id: productId, stock: 10, ...createTestProduct() };

      productRepository.findOneBy.mockResolvedValue(existingProduct as Product);

      // Act & Assert
      await expect(service.updateStock(productId, quantity, operation))
        .rejects.toThrow('Insufficient stock');
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      // Arrange
      const lowStockProducts = [
        { id: 1, stock: 2, minStock: 5, ...createTestProduct() },
        { id: 2, stock: 1, minStock: 3, ...createTestProduct({ name: 'Product 2' }) },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockProducts),
      };

      productRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.getLowStockProducts();

      // Assert
      expect(queryBuilder.where).toHaveBeenCalledWith('product.stock <= product.minStock');
      expect(result).toEqual(lowStockProducts);
    });
  });

  describe('update', () => {
    it('should update product successfully', async () => {
      // Arrange
      const productId = 1;
      const updateData = { name: 'Updated Product', price: 150.00 };
      const existingProduct = { id: productId, ...createTestProduct() };
      const updatedProduct = { ...existingProduct, ...updateData };

      productRepository.findOneBy.mockResolvedValue(existingProduct as Product);
      productRepository.save.mockResolvedValue(updatedProduct as Product);

      // Act
      const result = await service.update(productId, updateData);

      // Assert
      expect(productRepository.findOneBy).toHaveBeenCalledWith({ id: productId });
      expect(productRepository.save).toHaveBeenCalledWith(updatedProduct);
      expect(result).toEqual(updatedProduct);
    });

    it('should throw error if product not found', async () => {
      // Arrange
      const productId = 999;
      const updateData = { name: 'Updated Product' };
      productRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(productId, updateData)).rejects.toThrow('Product not found');
    });
  });

  describe('delete', () => {
    it('should soft delete product successfully', async () => {
      // Arrange
      const productId = 1;
      const existingProduct = { id: productId, ...createTestProduct() };
      const deletedProduct = { ...existingProduct, isActive: false };

      productRepository.findOneBy.mockResolvedValue(existingProduct as Product);
      productRepository.save.mockResolvedValue(deletedProduct as Product);

      // Act
      const result = await service.delete(productId);

      // Assert
      expect(productRepository.findOneBy).toHaveBeenCalledWith({ id: productId });
      expect(productRepository.save).toHaveBeenCalledWith(deletedProduct);
      expect(result.isActive).toBe(false);
    });
  });
});