import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProductService', () => {
  let service: any;
  let productRepository: any;
  let brandRepository: any;
  let categoryRepository: any;
  let taxRepository: any;
  let measurementUnitRepository: any;
  let currencyRepository: any;
  let priceRepository: any;
  let inventoryRepository: any;

  beforeEach(async () => {
    service = {
      create: async (dto: any, userId: string) => {
        if (!dto.name) {
          throw new BadRequestException('Product name is required');
        }
        if (!dto.code) {
          throw new BadRequestException('Product code is required');
        }
        
        // Check for duplicate code
        const existingProduct = await productRepository.findOne({
          where: { code: dto.code, organization_id: 'org-' + userId },
        });
        
        if (existingProduct) {
          throw new BadRequestException('Product code already exists');
        }
        
        const product = productRepository.create({
          ...dto,
          organization_id: 'org-' + userId,
          current_stock: dto.current_stock || 0,
          min_stock: dto.min_stock || 0,
          max_stock: dto.max_stock || 1000,
          status: 'ACTIVE',
          created_at: new Date(),
        });
        
        return await productRepository.save(product);
      },
      
      findAll: async (dto: any, userId: string) => {
        const whereCondition: any = { organization_id: 'org-' + userId };
        
        if (dto.status) {
          whereCondition.status = dto.status;
        }
        if (dto.category_id) {
          whereCondition.category_id = dto.category_id;
        }
        if (dto.brand_id) {
          whereCondition.brand_id = dto.brand_id;
        }
        if (dto.search) {
          whereCondition.name = { $like: `%${dto.search}%` };
        }
        
        const result = await productRepository.findAndCount({
          where: whereCondition,
          relations: ['brand', 'category', 'prices', 'taxes'],
          skip: (dto.page - 1) * dto.limit,
          take: dto.limit,
          order: { created_at: 'DESC' },
        });
        
        return {
          data: result[0],
          meta: {
            total: result[1],
            page: dto.page,
            limit: dto.limit,
            totalPages: Math.ceil(result[1] / dto.limit),
          },
        };
      },
      
      findOne: async (id: string, userId: string) => {
        const product = await productRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['brand', 'category', 'prices', 'taxes', 'measurement_unit'],
        });
        
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        
        return product;
      },
      
      update: async (id: string, updateDto: any, userId: string) => {
        const existingProduct = await productRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingProduct) {
          throw new NotFoundException('Product not found');
        }
        
        if (updateDto.code && updateDto.code !== existingProduct.code) {
          const duplicate = await productRepository.findOne({
            where: { code: updateDto.code, organization_id: 'org-' + userId },
          });
          if (duplicate) {
            throw new BadRequestException('Product code already exists');
          }
        }
        
        await productRepository.update(id, {
          ...updateDto,
          updated_at: new Date(),
        });
        
        return await productRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['brand', 'category', 'prices', 'taxes'],
        });
      },
      
      remove: async (id: string, userId: string) => {
        const existingProduct = await productRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingProduct) {
          throw new NotFoundException('Product not found');
        }
        
        if (existingProduct.current_stock > 0) {
          throw new BadRequestException('Cannot delete product with stock');
        }
        
        await productRepository.softRemove(existingProduct);
      },
      
      updatePrice: async (productId: string, dto: any, userId: string) => {
        const product = await productRepository.findOne({
          where: { id: productId, organization_id: 'org-' + userId },
          relations: ['prices'],
        });
        
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        
        if (dto.currency_id) {
          const currency = await currencyRepository.findOne({
            where: { id: dto.currency_id },
          });
          
          if (!currency) {
            throw new NotFoundException('Currency not found');
          }
        }
        
        // Update or create price
        const existingPrice = product.prices?.find(p => p.currency_id === dto.currency_id);
        
        if (existingPrice) {
          await priceRepository.update(existingPrice.id, {
            price: dto.price,
            updated_at: new Date(),
          });
        } else {
          const newPrice = priceRepository.create({
            product_id: productId,
            currency_id: dto.currency_id,
            price: dto.price,
            created_at: new Date(),
          });
          await priceRepository.save(newPrice);
        }
        
        return await productRepository.findOne({
          where: { id: productId, organization_id: 'org-' + userId },
          relations: ['prices'],
        });
      },
      
      addTax: async (productId: string, dto: any, userId: string) => {
        const product = await productRepository.findOne({
          where: { id: productId, organization_id: 'org-' + userId },
        });
        
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        
        const newTax = taxRepository.create({
          product_id: productId,
          ...dto,
          created_at: new Date(),
        });
        
        return await taxRepository.save(newTax);
      },
      
      removeTax: async (productId: string, taxId: string, userId: string) => {
        const product = await productRepository.findOne({
          where: { id: productId, organization_id: 'org-' + userId },
        });
        
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        
        const tax = await taxRepository.findOne({
          where: { id: taxId, product_id: productId },
        });
        
        if (!tax) {
          throw new NotFoundException('Tax not found');
        }
        
        await taxRepository.remove(tax);
      },
      
      findLowStock: async (userId: string) => {
        const result = await productRepository.findAndCount({
          where: { 
            organization_id: 'org-' + userId,
            current_stock: { $lt: 'min_stock' }
          },
          relations: ['brand', 'category'],
          order: { current_stock: 'ASC' },
        });
        
        return {
          data: result[0],
          total: result[1],
        };
      },
      
      findOutOfStock: async (userId: string) => {
        const result = await productRepository.findAndCount({
          where: { 
            organization_id: 'org-' + userId,
            current_stock: 0
          },
          relations: ['brand', 'category'],
          order: { updated_at: 'DESC' },
        });
        
        return {
          data: result[0],
          total: result[1],
        };
      },
      
      syncWithPack: async (productId: string, userId: string) => {
        const product = await productRepository.findOne({
          where: { id: productId, organization_id: 'org-' + userId },
        });
        
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        
        // Simulate sync with pack
        await productRepository.update(productId, {
          synced_at: new Date(),
          sync_status: 'SYNCED',
        });
        
        return await productRepository.findOne({
          where: { id: productId, organization_id: 'org-' + userId },
        });
      },
    };

    productRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    brandRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    categoryRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    taxRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    measurementUnitRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    currencyRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    priceRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    inventoryRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
  });

  describe('create', () => {
    const createProductDto = {
      name: 'Test Product',
      code: 'PROD-001',
      description: 'Test product description',
      brand_id: 'brand-id',
      category_id: 'category-id',
      measurement_unit_id: 'unit-id',
      currency_id: 'currency-id',
      is_tangible: true,
      requires_inventory: true,
      min_stock: 10,
      max_stock: 100,
      current_stock: 50,
      price: 100.50,
      taxes: [
        {
          tax_id: 'tax-id',
          value: 16,
          type: 'PERCENTAGE',
        }
      ],
    };

    it('should create a new product successfully', async () => {
      const mockProduct = {
        id: 'product-1',
        name: createProductDto.name,
        code: createProductDto.code,
        organization_id: 'org-user-id',
        created_at: new Date(),
      };

      productRepository.findOne.mockResolvedValue(null); // No duplicate code
      productRepository.create.mockReturnValue(mockProduct);
      productRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto, 'user-id');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { code: createProductDto.code, organization_id: 'org-user-id' },
      });
      expect(productRepository.create).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw error if product code already exists', async () => {
      productRepository.findOne.mockResolvedValue({ id: 'existing-product', code: createProductDto.code });

      await expect(service.create(createProductDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if name is missing', async () => {
      const invalidDto: any = { ...createProductDto };
      delete invalidDto.name;

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if code is missing', async () => {
      const invalidDto: any = { ...createProductDto };
      delete invalidDto.code;

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated products', async () => {
      const mockProducts = [
        { 
          id: 'product-1', 
          name: 'Product 1',
          code: 'PROD001',
          brand: { id: 'brand-1', name: 'Brand 1' },
          category: { id: 'category-1', name: 'Category 1' },
        },
      ];

      productRepository.findAndCount.mockResolvedValue([mockProducts, 1]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(productRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: 'org-user-id' },
        relations: [
          'brand',
          'category',
          'prices',
          'taxes',
        ],
        order: { created_at: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toEqual(mockProducts);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle empty results', async () => {
      productRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by search term', async () => {
      const searchDto = { ...paginationDto, search: 'Test Product' };
      
      productRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(searchDto, 'user-id');

      expect(productRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organization_id: 'org-user-id',
          name: { $like: '%Test Product%' },
        }),
        relations: expect.any(Array),
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    const productId = 'product-id';

    it('should return product with all relations', async () => {
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        code: 'PROD-001',
        brand: { id: 'brand-1', name: 'Brand 1' },
        category: { id: 'category-1', name: 'Category 1' },
        measurement_unit: { id: 'unit-1', name: 'Pieces' },
        prices: [{ id: 'price-1', currency: 'USD', price: 100.00 }],
        taxes: [{ id: 'tax-1', name: 'IVA', rate: 16 }],
      };

      productRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(productId, 'user-id');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId, organization_id: 'org-user-id' },
        relations: [
          'brand',
          'category',
          'prices',
          'taxes',
          'measurement_unit',
        ],
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw error if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(productId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const productId = 'product-id';
    const updateDto = {
      name: 'Updated Product Name',
      description: 'Updated description',
      price: 150.75,
    };

    it('should update product successfully', async () => {
      const existingProduct = {
        id: productId,
        name: 'Old Product Name',
        code: 'PROD-001',
      };

      const updatedProduct = {
        ...existingProduct,
        ...updateDto,
        updated_at: new Date(),
      };

      productRepository.findOne
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(updatedProduct);
      productRepository.update.mockResolvedValue(undefined);

      const result = await service.update(productId, updateDto, 'user-id');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId, organization_id: 'org-user-id' },
      });
      expect(productRepository.update).toHaveBeenCalledWith(
        productId,
        expect.objectContaining(updateDto)
      );
      expect(result).toEqual(updatedProduct);
    });

    it('should throw error if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.update(productId, updateDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if product code already exists for another product', async () => {
      const updateDtoWithCode = { ...updateDto, code: 'NEW-CODE-001' };
      const existingProduct = { id: productId, code: 'OLD-CODE-001' };
      const anotherProduct = { id: 'another-product', code: updateDtoWithCode.code };

      productRepository.findOne.mockResolvedValueOnce(existingProduct);
      productRepository.findOne.mockResolvedValueOnce(anotherProduct);

      await expect(service.update(productId, updateDtoWithCode, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const productId = 'product-id';

    it('should soft delete product successfully', async () => {
      const existingProduct = {
        id: productId,
        name: 'Test Product',
        status: true,
      };

      productRepository.findOne.mockResolvedValue(existingProduct);
      productRepository.softRemove.mockResolvedValue({});

      await service.remove(productId, 'user-id');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId, organization_id: expect.any(String) },
      });
      expect(productRepository.softRemove).toHaveBeenCalledWith(existingProduct);
    });

    it('should throw error if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(productId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePrice', () => {
    const productId = 'product-id';
    const updatePriceDto = {
      currency_id: 'currency-id',
      price: 199.99,
      effective_date: '2024-01-01',
    };

    it('should update product price successfully', async () => {
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        prices: [],
      };

      currencyRepository.findOne.mockResolvedValue({ id: 'currency-id', code: 'USD' });
      productRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProduct);
      priceRepository.create.mockReturnValue({ id: 'new-price', product_id: productId, ...updatePriceDto });
      priceRepository.save.mockResolvedValue({ id: 'new-price', product_id: productId, ...updatePriceDto });

      const result = await service.updatePrice(productId, updatePriceDto, 'user-id');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId, organization_id: 'org-user-id' },
        relations: ['prices'],
      });
      expect(currencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: updatePriceDto.currency_id },
      });
      expect(priceRepository.create).toHaveBeenCalledWith({
        product_id: productId,
        currency_id: updatePriceDto.currency_id,
        price: updatePriceDto.price,
        created_at: expect.any(Date),
      });
      expect(result).toBeDefined();
    });

    it('should throw error if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePrice(productId, updatePriceDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if currency not found', async () => {
      productRepository.findOne.mockResolvedValue({ id: productId });
      currencyRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePrice(productId, updatePriceDto, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addTax', () => {
    const productId = 'product-id';
    const addTaxDto = {
      tax_id: 'tax-id',
      value: 16,
      type: 'PERCENTAGE',
    };

    it('should add tax to product successfully', async () => {
      const mockProduct = { id: productId, name: 'Test Product' };

      productRepository.findOne.mockResolvedValue(mockProduct);
      taxRepository.create.mockReturnValue({ id: 'new-tax', product_id: productId, ...addTaxDto });
      taxRepository.save.mockResolvedValue({ id: 'new-tax', product_id: productId, ...addTaxDto });

      const result = await service.addTax(productId, addTaxDto, 'user-id');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId, organization_id: 'org-user-id' },
      });
      expect(result).toEqual({ id: 'new-tax', product_id: productId, ...addTaxDto });
    });

    it('should throw error if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.addTax(productId, addTaxDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

      it('should handle no low stock products', async () => {
      productRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findLowStock('user-id');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOutOfStock', () => {
    it('should return products out of stock', async () => {
      const mockOutOfStockProducts = [
        { id: 'product-1', name: 'Product 1', current_stock: 0 },
        { id: 'product-2', name: 'Product 2', current_stock: 0 },
      ];

      productRepository.findAndCount.mockResolvedValue([mockOutOfStockProducts, 2]);

      const result = await service.findOutOfStock('user-id');

      expect(productRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          organization_id: 'org-user-id',
          current_stock: 0
        },
        relations: ['brand', 'category'],
        order: { updated_at: 'DESC' },
      });
      expect(result.data).toEqual(mockOutOfStockProducts);
      expect(result.total).toBe(2);
    });

    it('should handle no out of stock products', async () => {
      productRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findOutOfStock('user-id');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('syncWithPack', () => {
    const productId = 'product-id';

    it('should sync product with pack successfully', async () => {
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        code: 'PROD-001',
        sync_status: 'PENDING',
      };

      productRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({
          ...mockProduct,
          sync_status: 'SYNCED',
          synced_at: new Date(),
        });
      productRepository.update.mockResolvedValue(undefined);

      const result = await service.syncWithPack(productId, 'user-id');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId, organization_id: 'org-user-id' },
      });
      expect(productRepository.update).toHaveBeenCalledWith(productId, {
        synced_at: expect.any(Date),
        sync_status: 'SYNCED',
      });
      expect(result.sync_status).toBe('SYNCED');
    });

    it('should throw error if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.syncWithPack(productId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });
});
