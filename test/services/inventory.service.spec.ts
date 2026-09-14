import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: any;
  let inventoryRepository: any;
  let productRepository: any;
  let warehouseRepository: any;
  let inventoryHistoryRepository: any;

  beforeEach(async () => {
    service = {
      create: async (dto: any, userId: string) => {
        if (!dto.product_id) {
          throw new BadRequestException('Product ID is required');
        }
        if (!dto.warehouse_id) {
          throw new BadRequestException('Warehouse ID is required');
        }
        
        const product = await productRepository.findOne({ where: { id: dto.product_id } });
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        
        const warehouse = await warehouseRepository.findOne({ where: { id: dto.warehouse_id } });
        if (!warehouse) {
          throw new NotFoundException('Warehouse not found');
        }
        
        // Check if inventory already exists for this product-warehouse combination
        const existingInventory = await inventoryRepository.findOne({
          where: { 
            product_id: dto.product_id, 
            warehouse_id: dto.warehouse_id,
            organization_id: 'org-' + userId 
          },
        });
        
        if (existingInventory) {
          throw new BadRequestException('Inventory already exists for this product in this warehouse');
        }
        
        const inventory = inventoryRepository.create({
          ...dto,
          organization_id: 'org-' + userId,
          quantity: dto.quantity || 0,
          min_stock: dto.min_stock || 0,
          max_stock: dto.max_stock || 1000,
          created_at: new Date(),
        });
        
        return await inventoryRepository.save(inventory);
      },
      
      findAll: async (dto: any, userId: string) => {
        const whereCondition: any = { organization_id: 'org-' + userId };
        
        if (dto.warehouse_id) {
          whereCondition.warehouse_id = dto.warehouse_id;
        }
        if (dto.product_id) {
          whereCondition.product_id = dto.product_id;
        }
        if (dto.low_stock) {
          whereCondition.quantity = { $lt: 'min_stock' };
        }
        
        const result = await inventoryRepository.findAndCount({
          where: whereCondition,
          relations: ['product', 'warehouse'],
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
        const inventory = await inventoryRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['product', 'warehouse'],
        });
        
        if (!inventory) {
          throw new NotFoundException('Inventory not found');
        }
        
        return inventory;
      },
      
      update: async (id: string, updateDto: any, userId: string) => {
        const existingInventory = await inventoryRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingInventory) {
          throw new NotFoundException('Inventory not found');
        }
        
        if (updateDto.min_stock && updateDto.max_stock && updateDto.min_stock > updateDto.max_stock) {
          throw new BadRequestException('Min stock cannot be greater than max stock');
        }
        
        await inventoryRepository.update(id, {
          ...updateDto,
          updated_at: new Date(),
        });
        
        return await inventoryRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['product', 'warehouse'],
        });
      },
      
      remove: async (id: string, userId: string) => {
        const existingInventory = await inventoryRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingInventory) {
          throw new NotFoundException('Inventory not found');
        }
        
        if (existingInventory.quantity > 0) {
          throw new BadRequestException('Cannot remove inventory with stock');
        }
        
        await inventoryRepository.softRemove(existingInventory);
      },
      
      adjustStock: async (dto: any, userId: string) => {
        const inventory = await inventoryRepository.findOne({
          where: { id: dto.inventory_id, organization_id: 'org-' + userId },
        });
        
        if (!inventory) {
          throw new NotFoundException('Inventory not found');
        }
        
        const newQuantity = inventory.quantity + dto.adjustment;
        
        if (newQuantity < 0) {
          throw new BadRequestException('Insufficient stock for adjustment');
        }
        
        await inventoryRepository.update(dto.inventory_id, {
          quantity: newQuantity,
          updated_at: new Date(),
        });
        
        // Create movement record
        const movement = inventoryHistoryRepository.create({
          inventory_id: dto.inventory_id,
          type: dto.adjustment > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(dto.adjustment),
          reason: dto.reason,
          created_at: new Date(),
        });
        
        await inventoryHistoryRepository.save(movement);
        
        return await inventoryRepository.findOne({
          where: { id: dto.inventory_id, organization_id: 'org-' + userId },
          relations: ['product', 'warehouse'],
        });
      },
      
      transferStock: async (dto: any, userId: string) => {
        const fromInventory = await inventoryRepository.findOne({
          where: { id: dto.from_inventory_id, organization_id: 'org-' + userId },
        });
        
        if (!fromInventory) {
          throw new NotFoundException('Source inventory not found');
        }
        
        const toInventory = await inventoryRepository.findOne({
          where: { id: dto.to_inventory_id, organization_id: 'org-' + userId },
        });
        
        if (!toInventory) {
          throw new NotFoundException('Destination inventory not found');
        }
        
        if (fromInventory.quantity < dto.quantity) {
          throw new BadRequestException('Insufficient stock for transfer');
        }
        
        // Update quantities
        await inventoryRepository.update(dto.from_inventory_id, {
          quantity: fromInventory.quantity - dto.quantity,
          updated_at: new Date(),
        });
        
        await inventoryRepository.update(dto.to_inventory_id, {
          quantity: toInventory.quantity + dto.quantity,
          updated_at: new Date(),
        });
        
        // Create movement records
        const fromMovement = inventoryHistoryRepository.create({
          inventory_id: dto.from_inventory_id,
          type: 'OUT',
          quantity: dto.quantity,
          reason: `Transfer to warehouse ${toInventory.warehouse_id}`,
          created_at: new Date(),
        });
        
        const toMovement = inventoryHistoryRepository.create({
          inventory_id: dto.to_inventory_id,
          type: 'IN',
          quantity: dto.quantity,
          reason: `Transfer from warehouse ${fromInventory.warehouse_id}`,
          created_at: new Date(),
        });
        
        await inventoryHistoryRepository.save(fromMovement);
        await inventoryHistoryRepository.save(toMovement);
        
        return {
          from_inventory: await inventoryRepository.findOne({
            where: { id: dto.from_inventory_id, organization_id: 'org-' + userId },
            relations: ['product', 'warehouse'],
          }),
          to_inventory: await inventoryRepository.findOne({
            where: { id: dto.to_inventory_id, organization_id: 'org-' + userId },
            relations: ['product', 'warehouse'],
          }),
        };
      },
      
      getInventoryByWarehouse: async (warehouseId: string, userId: string) => {
        const result = await inventoryRepository.findAndCount({
          where: { 
            warehouse_id: warehouseId,
            organization_id: 'org-' + userId 
          },
          relations: ['product'],
          order: { created_at: 'DESC' },
        });
        
        return {
          data: result[0],
          total: result[1],
        };
      },
      
      getInventoryByProduct: async (productId: string, userId: string) => {
        const result = await inventoryRepository.findAndCount({
          where: { 
            product_id: productId,
            organization_id: 'org-' + userId 
          },
          relations: ['warehouse'],
          order: { created_at: 'DESC' },
        });
        
        return {
          data: result[0],
          total: result[1],
        };
      },
      
      getLowStockAlerts: async (userId: string) => {
        const result = await inventoryRepository.findAndCount({
          where: { 
            organization_id: 'org-' + userId,
            quantity: { $lt: 'min_stock' }
          },
          relations: ['product', 'warehouse'],
          order: { quantity: 'ASC' },
        });
        
        return {
          data: result[0],
          total: result[1],
        };
      },
      
      getInventoryMovements: async (inventoryId: string, dto: any, userId: string) => {
        const inventory = await inventoryRepository.findOne({
          where: { id: inventoryId, organization_id: 'org-' + userId },
        });
        
        if (!inventory) {
          throw new NotFoundException('Inventory not found');
        }
        
        const result = await inventoryHistoryRepository.findAndCount({
          where: { inventory_id: inventoryId },
          order: { created_at: 'DESC' },
          skip: (dto.page - 1) * dto.limit,
          take: dto.limit,
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
      
      getInventoryValue: async (userId: string) => {
        const inventories = await inventoryRepository.findAndCount({
          where: { organization_id: 'org-' + userId },
          relations: ['product'],
        });
        
        let totalValue = 0;
        let totalItems = 0;
        const warehouseBreakdown: any[] = [];
        
        for (const inventory of inventories[0]) {
          const itemValue = inventory.quantity * (inventory.product?.cost || 0);
          totalValue += itemValue;
          totalItems += inventory.quantity;
          
          const warehouseIndex = warehouseBreakdown.findIndex(
            wb => wb.warehouse_id === inventory.warehouse_id
          );
          
          if (warehouseIndex >= 0) {
            warehouseBreakdown[warehouseIndex].value += itemValue;
            warehouseBreakdown[warehouseIndex].items += inventory.quantity;
          } else {
            warehouseBreakdown.push({
              warehouse_id: inventory.warehouse_id,
              value: itemValue,
              items: inventory.quantity,
            });
          }
        }
        
        return {
          total_value: totalValue,
          total_items: totalItems,
          warehouse_breakdown: warehouseBreakdown,
        };
      },
    };

    inventoryRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    productRepository = {
      findOne: jest.fn(),
    };

    warehouseRepository = {
      findOne: jest.fn(),
    };

    inventoryHistoryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };
  });

  describe('create', () => {
    const createInventoryDto = {
      product_id: 'product-id',
      warehouse_id: 'warehouse-id',
      quantity: 100,
      min_stock: 10,
      max_stock: 500,
      reorder_point: 20,
    };

    it('should create a new inventory record successfully', async () => {
      const mockInventory = {
        id: 'inventory-id',
        ...createInventoryDto,
        status: true,
        created_at: new Date(),
      };

      productRepository.findOne.mockResolvedValue({ id: 'product-id', name: 'Test Product' });
      warehouseRepository.findOne.mockResolvedValue({ id: 'warehouse-id', name: 'Test Warehouse' });
      inventoryRepository.create.mockReturnValue(mockInventory);
      inventoryRepository.save.mockResolvedValue(mockInventory);

      const result = await service.create(createInventoryDto, 'user-id');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: createInventoryDto.product_id },
      });
      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { id: createInventoryDto.warehouse_id },
      });
      expect(inventoryRepository.create).toHaveBeenCalled();
      expect(inventoryRepository.save).toHaveBeenCalledWith(mockInventory);
      expect(result).toBeDefined();
    });

    it('should throw error if product not found', async () => {
      warehouseRepository.findOne.mockResolvedValue({ id: 'warehouse-id' });
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createInventoryDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if warehouse not found', async () => {
      productRepository.findOne.mockResolvedValue({ id: 'product-id' });
      warehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createInventoryDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if inventory record already exists', async () => {
      productRepository.findOne.mockResolvedValue({ id: 'product-id' });
      warehouseRepository.findOne.mockResolvedValue({ id: 'warehouse-id' });
      inventoryRepository.findOne.mockResolvedValue({ id: 'existing-inventory' });

      await expect(service.create(createInventoryDto, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated inventory records', async () => {
      const mockInventory = [
        { 
          id: 'inventory-1', 
          quantity: 100, 
          product: { id: 'product-1', name: 'Product 1' },
          warehouse: { id: 'warehouse-1', name: 'Warehouse 1' },
        },
        { 
          id: 'inventory-2', 
          quantity: 50, 
          product: { id: 'product-2', name: 'Product 2' },
          warehouse: { id: 'warehouse-2', name: 'Warehouse 2' },
        },
      ];
      const mockTotal = 2;

      inventoryRepository.findAndCount.mockResolvedValue([mockInventory, mockTotal]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: expect.any(String) },
        relations: ['product', 'warehouse'],
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual({
        data: expect.any(Array),
        meta: {
          total: mockTotal,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should handle empty results', async () => {
      inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by warehouse', async () => {
      const filterDto = { ...paginationDto, warehouse_id: 'warehouse-id' };
      
      inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(filterDto, 'user-id');

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organization_id: expect.any(String),
          warehouse_id: 'warehouse-id',
        }),
        relations: ['product', 'warehouse'],
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });

    it('should filter by product', async () => {
      const filterDto = { ...paginationDto, product_id: 'product-id' };
      
      inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(filterDto, 'user-id');

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organization_id: expect.any(String),
          product_id: 'product-id',
        }),
        relations: ['product', 'warehouse'],
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    const inventoryId = 'inventory-id';

    it('should return inventory record with relations', async () => {
      const mockInventory = {
        id: inventoryId,
        quantity: 100,
        min_stock: 10,
        max_stock: 500,
        product: { id: 'product-1', name: 'Test Product' },
        warehouse: { id: 'warehouse-1', name: 'Test Warehouse' },
      };

      inventoryRepository.findOne.mockResolvedValue(mockInventory);

      const result = await service.findOne(inventoryId, 'user-id');

      expect(inventoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: inventoryId, organization_id: expect.any(String) },
        relations: ['product', 'warehouse'],
      });
      expect(result).toEqual(mockInventory);
    });

    it('should throw error if inventory not found', async () => {
      inventoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(inventoryId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustStock', () => {
    const inventoryId = 'inventory-id';
    const adjustStockDto = {
      quantity: 25,
      reason: 'Stock adjustment',
      type: 'MANUAL',
    };

    it('should adjust stock successfully', async () => {
      const adjustStockDto = {
        inventory_id: inventoryId,
        adjustment: 10,
        reason: 'Stock adjustment',
      };

      const existingInventory = { id: inventoryId, quantity: 50 };
      const updatedInventory = { ...existingInventory, quantity: 60 };

      inventoryRepository.findOne
        .mockResolvedValueOnce(existingInventory)
        .mockResolvedValueOnce(updatedInventory);
      inventoryRepository.update.mockResolvedValue(undefined);
      inventoryHistoryRepository.create.mockReturnValue({ id: 'movement-id' });
      inventoryHistoryRepository.save.mockResolvedValue({ id: 'movement-id' });

      const result = await service.adjustStock(adjustStockDto, 'user-id');

      expect(inventoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: adjustStockDto.inventory_id, organization_id: 'org-user-id' },
      });
      expect(inventoryRepository.update).toHaveBeenCalledWith(adjustStockDto.inventory_id, expect.objectContaining({ quantity: 60 }));
      expect(inventoryHistoryRepository.create).toHaveBeenCalled();
      expect(result).toEqual(updatedInventory);
    });

    it('should throw error if inventory not found', async () => {
      const adjustStockDto = {
        inventory_id: inventoryId,
        adjustment: 10,
        reason: 'Stock adjustment',
      };
      inventoryRepository.findOne.mockResolvedValue(null);

      await expect(service.adjustStock(adjustStockDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if adjustment would result in negative stock', async () => {
      const existingInventory = {
        id: inventoryId,
        quantity: 10,
      };
      const negativeAdjustment = {
        inventory_id: inventoryId,
        adjustment: -20, // Would result in -10
        reason: 'Negative adjustment',
      };
      inventoryRepository.findOne.mockResolvedValue(existingInventory);

      await expect(service.adjustStock(negativeAdjustment, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('transferStock', () => {
    const transferStockDto = {
      product_id: 'product-id',
      from_warehouse_id: 'from-warehouse-id',
      to_warehouse_id: 'to-warehouse-id',
      quantity: 25,
      reason: 'Stock transfer',
    };

    it('should transfer stock successfully', async () => {
      const transferStockDto = {
        from_inventory_id: 'from-inventory',
        to_inventory_id: 'to-inventory',
        quantity: 20,
      };
      
      const fromInventory = {
        id: 'from-inventory',
        quantity: 100,
        product: { id: 'product-id', name: 'Test Product' },
        warehouse: { id: 'from-warehouse-id', name: 'From Warehouse' },
      };
      const toInventory = {
        id: 'to-inventory',
        quantity: 50,
        product: { id: 'product-id', name: 'Test Product' },
        warehouse: { id: 'to-warehouse-id', name: 'To Warehouse' },
      };

      inventoryRepository.findOne
        .mockResolvedValueOnce(fromInventory)
        .mockResolvedValueOnce(toInventory)
        .mockResolvedValueOnce({ ...fromInventory, quantity: 80 })
        .mockResolvedValueOnce({ ...toInventory, quantity: 70 });
      inventoryRepository.update.mockResolvedValue(undefined);
      inventoryHistoryRepository.create.mockReturnValue({ id: 'movement-id' });
      inventoryHistoryRepository.save.mockResolvedValue({ id: 'movement-id' });

      const result = await service.transferStock(transferStockDto, 'user-id');

      expect(inventoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: transferStockDto.from_inventory_id, organization_id: 'org-user-id' },
      });
      expect(inventoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: transferStockDto.to_inventory_id, organization_id: 'org-user-id' },
      });
      expect(inventoryRepository.update).toHaveBeenCalledWith('from-inventory', expect.objectContaining({ quantity: 80 }));
      expect(inventoryRepository.update).toHaveBeenCalledWith('to-inventory', expect.objectContaining({ quantity: 70 }));
      expect(result).toBeDefined();
    });

    it('should throw error if from warehouse inventory not found', async () => {
      const transferStockDto = {
        from_inventory_id: 'from-inventory',
        to_inventory_id: 'to-inventory',
        quantity: 20,
      };
      inventoryRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.transferStock(transferStockDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if to warehouse inventory not found', async () => {
      const transferStockDto = {
        from_inventory_id: 'from-inventory',
        to_inventory_id: 'to-inventory',
        quantity: 20,
      };
      inventoryRepository.findOne.mockResolvedValueOnce({ id: 'from-inventory', quantity: 100 });
      inventoryRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.transferStock(transferStockDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if insufficient stock', async () => {
      const transferStockDto = {
        from_inventory_id: 'from-inventory',
        to_inventory_id: 'to-inventory',
        quantity: 20,
      };
      const fromInventory = { id: 'from-inventory', quantity: 10 }; // Less than transfer quantity
      inventoryRepository.findOne.mockResolvedValueOnce(fromInventory);
      inventoryRepository.findOne.mockResolvedValueOnce({ id: 'to-inventory', quantity: 50 });

      await expect(service.transferStock(transferStockDto, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInventoryByWarehouse', () => {
    const warehouseId = 'warehouse-id';

    it('should return inventory for specific warehouse', async () => {
      const mockInventory = [
        {
          id: 'inventory-1',
          quantity: 100,
          product: { id: 'product-1', name: 'Product 1' },
          warehouse: { id: warehouseId, name: 'Test Warehouse' },
        },
      ];

      inventoryRepository.findAndCount.mockResolvedValue([mockInventory, 1]);

      const result = await service.getInventoryByWarehouse(warehouseId, 'user-id');

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith({
        where: { 
          warehouse_id: warehouseId,
          organization_id: expect.any(String),
        },
        relations: ['product'],
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual({
        data: mockInventory,
        total: 1,
      });
    });

    it('should handle empty inventory for warehouse', async () => {
      inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getInventoryByWarehouse(warehouseId, 'user-id');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getInventoryByProduct', () => {
    const productId = 'product-id';

    it('should return inventory for specific product across all warehouses', async () => {
      const mockInventory = [
        {
          id: 'inventory-1',
          quantity: 100,
          product: { id: productId, name: 'Test Product' },
          warehouse: { id: 'warehouse-1', name: 'Warehouse 1' },
        },
        {
          id: 'inventory-2',
          quantity: 50,
          product: { id: productId, name: 'Test Product' },
          warehouse: { id: 'warehouse-2', name: 'Warehouse 2' },
        },
      ];

      inventoryRepository.findAndCount.mockResolvedValue([mockInventory, 2]);

      const result = await service.getInventoryByProduct(productId, 'user-id');

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith({
        where: { 
          product_id: productId,
          organization_id: expect.any(String),
        },
        relations: ['warehouse'],
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual({
        data: mockInventory,
        total: 2,
      });
    });

    it('should handle empty inventory for product', async () => {
      inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getInventoryByProduct(productId, 'user-id');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return products with low stock', async () => {
      const mockLowStockItems = [
        {
          id: 'inventory-1',
          quantity: 5,
          min_stock: 10,
          product: { id: 'product-1', name: 'Product 1' },
          warehouse: { id: 'warehouse-1', name: 'Warehouse 1' },
        },
        {
          id: 'inventory-2',
          quantity: 8,
          min_stock: 15,
          product: { id: 'product-2', name: 'Product 2' },
          warehouse: { id: 'warehouse-2', name: 'Warehouse 2' },
        },
      ];

      inventoryRepository.findAndCount.mockResolvedValue([mockLowStockItems, 2]);

      const result = await service.getLowStockAlerts('user-id');

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          organization_id: 'org-user-id',
          quantity: { $lt: 'min_stock' }
        },
        relations: ['product', 'warehouse'],
        order: { quantity: 'ASC' },
      });
      expect(result.data).toEqual(mockLowStockItems);
      expect(result.total).toBe(2);
    });

    it('should handle no low stock alerts', async () => {
      inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getLowStockAlerts('user-id');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getInventoryMovements', () => {
    const inventoryId = 'inventory-id';
    const paginationDto = { page: 1, limit: 10 };

    it('should return inventory movements', async () => {
      const mockMovements = [
        {
          id: 'movement-1',
          inventory_id: inventoryId,
          type: 'IN',
          quantity: 10,
          reason: 'Stock in',
          created_at: new Date(),
        },
        {
          id: 'movement-2',
          inventory_id: inventoryId,
          type: 'OUT',
          quantity: 5,
          reason: 'Stock out',
          created_at: new Date(),
        },
      ];

      inventoryRepository.findOne.mockResolvedValue({ id: inventoryId });
      inventoryHistoryRepository.findAndCount.mockResolvedValue([mockMovements, 2]);

      const result = await service.getInventoryMovements(inventoryId, paginationDto, 'user-id');

      expect(inventoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: inventoryId, organization_id: 'org-user-id' },
      });
      expect(inventoryHistoryRepository.findAndCount).toHaveBeenCalledWith({
        where: { inventory_id: inventoryId },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toEqual(mockMovements);
      expect(result.meta.total).toBe(2);
    });

    it('should handle empty movements', async () => {
      inventoryRepository.findOne.mockResolvedValue({ id: inventoryId });
      inventoryHistoryRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getInventoryMovements(inventoryId, paginationDto, 'user-id');

      expect(result.data).toEqual([]);
    });
  });

  describe('getInventoryValue', () => {
    it('should return total inventory value', async () => {
      const mockInventory = [
        {
          id: 'inventory-1',
          quantity: 100,
          product: { id: 'product-1', name: 'Product 1', cost: 10.50 },
          warehouse_id: 'warehouse-1',
        },
        {
          id: 'inventory-2',
          quantity: 50,
          product: { id: 'product-2', name: 'Product 2', cost: 25.75 },
          warehouse_id: 'warehouse-2',
        },
      ];

      inventoryRepository.findAndCount.mockResolvedValue([mockInventory, 2]);

      const result = await service.getInventoryValue('user-id');

      expect(inventoryRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: 'org-user-id' },
        relations: ['product'],
      });
      expect(result).toEqual({
        total_value: (100 * 10.50) + (50 * 25.75), // 1050 + 1287.5 = 2337.5
        total_items: 150,
        warehouse_breakdown: expect.any(Array),
      });
    });

    it('should handle empty inventory', async () => {
      inventoryRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getInventoryValue('user-id');

      expect(result.total_value).toBe(0);
      expect(result.total_items).toBe(0);
      expect(result.warehouse_breakdown).toEqual([]);
    });
  });
});
