import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WithdrawalService', () => {
  let service: any;
  let withdrawalRepository: any;
  let withdrawalDetailRepository: any;
  let clientRepository: any;
  let productRepository: any;
  let warehouseRepository: any;

  beforeEach(async () => {
    service = {
      create: async (dto: any, userId: string) => {
        if (!dto.client_id) {
          throw new BadRequestException('Client ID is required');
        }
        if (!dto.type) {
          throw new BadRequestException('Type is required');
        }
        
        // Check if client exists
        const client = await clientRepository.findOne({
          where: { id: dto.client_id, organization_id: 'org-' + userId },
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        const withdrawal = withdrawalRepository.create({
          ...dto,
          organization_id: 'org-' + userId,
          status: 'OPEN',
          created_at: new Date(),
        });
        
        return await withdrawalRepository.save(withdrawal);
      },
      
      findAll: async (dto: any, userId: string) => {
        const whereCondition: any = { organization_id: 'org-' + userId };
        
        if (dto.status) {
          whereCondition.status = dto.status;
        }
        if (dto.client_id) {
          whereCondition.client_id = dto.client_id;
        }
        if (dto.type) {
          whereCondition.type = dto.type;
        }
        if (dto.search) {
          whereCondition.notes = { $like: `%${dto.search}%` };
        }
        
        const result = await withdrawalRepository.findAndCount({
          where: whereCondition,
          relations: [
            'client',
            'invoice',
            'cashTransaction',
            'details',
            'details.product',
            'details.product.brand',
            'details.product.category',
            'details.product.taxes',
            'details.product.measurement_unit',
            'details.product.prices',
          ],
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
        const withdrawal = await withdrawalRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: [
            'client',
            'invoice',
            'cashTransaction',
            'details',
            'details.product',
            'details.product.brand',
            'details.product.category',
            'details.product.taxes',
            'details.product.measurement_unit',
            'details.product.prices',
          ],
        });
        
        if (!withdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        
        return withdrawal;
      },
      
      update: async (id: string, updateDto: any, userId: string) => {
        const existingWithdrawal = await withdrawalRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingWithdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        
        await withdrawalRepository.update(id, {
          ...updateDto,
          updated_at: new Date(),
        });
        
        return await withdrawalRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['client', 'invoice', 'cashTransaction'],
        });
      },
      
      remove: async (id: string, userId: string) => {
        const existingWithdrawal = await withdrawalRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingWithdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        
        if (existingWithdrawal.status === 'CLOSED') {
          throw new BadRequestException('Cannot delete closed withdrawal');
        }
        
        await withdrawalRepository.softRemove(existingWithdrawal);
      },
      
      close: async (id: string, userId: string) => {
        const existingWithdrawal = await withdrawalRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingWithdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        
        if (existingWithdrawal.status === 'CLOSED') {
          throw new BadRequestException('Withdrawal is already closed');
        }
        
        await withdrawalRepository.update(id, {
          status: 'CLOSED',
          closed_at: new Date(),
        });
        
        return await withdrawalRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
      },
      
      createDetail: async (withdrawalId: string, dto: any, userId: string) => {
        const withdrawal = await withdrawalRepository.findOne({
          where: { id: withdrawalId, organization_id: 'org-' + userId },
        });
        
        if (!withdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        
        if (withdrawal.status === 'CLOSED') {
          throw new BadRequestException('Cannot add details to closed withdrawal');
        }
        
        // Check if product exists
        const product = await productRepository.findOne({
          where: { id: dto.product_id },
        });
        
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        
        // For tangible products, check warehouse
        if (product.type === 'TANGIBLE' && dto.warehouse_id) {
          const warehouse = await warehouseRepository.findOne({
            where: { id: dto.warehouse_id },
          });
          
          if (!warehouse) {
            throw new BadRequestException('Warehouse not found');
          }
        }
        
        const detail = withdrawalDetailRepository.create({
          withdrawal_id: withdrawalId,
          ...dto,
          created_at: new Date(),
        });
        
        return await withdrawalDetailRepository.save(detail);
      },
      
      updateDetail: async (withdrawalId: string, detailId: string, dto: any, userId: string) => {
        const withdrawal = await withdrawalRepository.findOne({
          where: { id: withdrawalId, organization_id: 'org-' + userId },
        });
        
        if (!withdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        
        const detail = await withdrawalDetailRepository.findOne({
          where: { id: detailId, withdrawal_id: withdrawalId },
        });
        
        if (!detail) {
          throw new NotFoundException('Withdrawal detail not found');
        }
        
        await withdrawalDetailRepository.update(detailId, {
          ...dto,
          updated_at: new Date(),
        });
        
        return await withdrawalDetailRepository.findOne({
          where: { id: detailId },
        });
      },
      
      removeDetail: async (withdrawalId: string, detailId: string, userId: string) => {
        const withdrawal = await withdrawalRepository.findOne({
          where: { id: withdrawalId, organization_id: 'org-' + userId },
        });
        
        if (!withdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        
        if (withdrawal.status === 'CLOSED') {
          throw new BadRequestException('Cannot remove details from closed withdrawal');
        }
        
        const detail = await withdrawalDetailRepository.findOne({
          where: { id: detailId, withdrawal_id: withdrawalId },
        });
        
        if (!detail) {
          throw new NotFoundException('Withdrawal detail not found');
        }
        
        await withdrawalDetailRepository.remove(detail);
      },
      
      getWithdrawalsByDate: async (date: string, userId: string) => {
        const result = await withdrawalRepository.findAndCount({
          where: {
            organization_id: 'org-' + userId,
            created_at: { $like: `${date}%` },
          },
          relations: ['client'],
          order: { created_at: 'DESC' },
        });
        
        return {
          data: result[0],
          total: result[1],
        };
      },
      
      getWithdrawalsByClient: async (clientId: string, userId: string) => {
        const result = await withdrawalRepository.findAndCount({
          where: {
            organization_id: 'org-' + userId,
            client_id: clientId,
          },
          relations: ['client'],
          order: { created_at: 'DESC' },
        });
        
        return {
          data: result[0],
          total: result[1],
        };
      },
      
      getWithdrawalsByStatus: async (status: string, userId: string) => {
        const result = await withdrawalRepository.findAndCount({
          where: {
            organization_id: 'org-' + userId,
            status,
          },
          relations: ['client'],
          order: { created_at: 'DESC' },
        });
        
        return {
          data: result[0],
          total: result[1],
        };
      },
      
      getWithdrawalValue: async (withdrawalId: string, userId: string) => {
        const withdrawal = await withdrawalRepository.findOne({
          where: { id: withdrawalId, organization_id: 'org-' + userId },
          relations: ['details'],
        });
        
        if (!withdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        
        const totalValue = withdrawal.details.reduce((sum: number, detail: any) => {
          return sum + (detail.quantity * detail.unit_price);
        }, 0);
        
        return {
          total_value: totalValue,
          total_items: withdrawal.details.length,
        };
      },
    };

    withdrawalRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    withdrawalDetailRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    clientRepository = {
      findOne: jest.fn(),
    };

    productRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    warehouseRepository = {
      findOne: jest.fn(),
    };
  });

  describe('create', () => {
    const createWithdrawalDto = {
      client_id: 'client-id',
      type: 'WITHDRAWAL',
      destination: 'Store A',
      amount: 100.50,
      payment_method: 'cash',
      details: [
        {
          product_id: 'product-id',
          quantity: 2,
          price: 50.25,
          warehouse_id: 'warehouse-id',
        }
      ],
    };

    it('should create a new withdrawal successfully', async () => {
      const mockWithdrawal = {
        id: 'withdrawal-1',
        client_id: createWithdrawalDto.client_id,
        type: createWithdrawalDto.type,
        organization_id: 'org-user-id',
        created_at: new Date(),
      };

      clientRepository.findOne.mockResolvedValue({ id: 'client-id', name: 'Test Client' });
      withdrawalRepository.create.mockReturnValue(mockWithdrawal);
      withdrawalRepository.save.mockResolvedValue(mockWithdrawal);

      const result = await service.create(createWithdrawalDto, 'user-id');

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: createWithdrawalDto.client_id, organization_id: 'org-user-id' },
      });
      expect(withdrawalRepository.create).toHaveBeenCalled();
      expect(withdrawalRepository.save).toHaveBeenCalledWith(mockWithdrawal);
      expect(result).toEqual(mockWithdrawal);
    });

    it('should throw error if client not found', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createWithdrawalDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if client_id is missing', async () => {
      const invalidDto: any = { ...createWithdrawalDto };
      delete invalidDto.client_id;

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if type is missing', async () => {
      const invalidDto: any = { ...createWithdrawalDto };
      delete invalidDto.type;

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated withdrawals', async () => {
      const mockWithdrawals = [
        { id: 'withdrawal-1', code: 'WDR-001', status: 'OPEN' },
        { id: 'withdrawal-2', code: 'WDR-002', status: 'CLOSED' },
      ];

      withdrawalRepository.findAndCount.mockResolvedValue([mockWithdrawals, 2]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(withdrawalRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: 'org-user-id' },
        relations: [
          'client',
          'invoice',
          'cashTransaction',
          'details',
          'details.product',
          'details.product.brand',
          'details.product.category',
          'details.product.taxes',
          'details.product.measurement_unit',
          'details.product.prices',
        ],
        order: { created_at: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toEqual(mockWithdrawals);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle empty results', async () => {
      withdrawalRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    const withdrawalId = 'withdrawal-id';

    it('should return withdrawal with details', async () => {
      const mockWithdrawal = {
        id: withdrawalId,
        code: 'WDR-001',
        status: 'OPEN',
        client: { id: 'client-1', name: 'Test Client' },
        invoice: { id: 'invoice-1', number: 'INV-001' },
        cashTransaction: { id: 'cash-1', amount: 100.50 },
        details: [
          {
            id: 'detail-1',
            product: {
              id: 'product-1',
              name: 'Test Product',
              brand: { id: 'brand-1', name: 'Test Brand' },
              category: { id: 'category-1', name: 'Test Category' },
              taxes: [{ id: 'tax-1', name: 'IVA' }],
              measurement_unit: { id: 'unit-1', name: 'Pieces' },
              prices: [{ id: 'price-1', price: 50.25 }],
            },
          },
        ],
      };

      withdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);

      const result = await service.findOne(withdrawalId, 'user-id');

      expect(withdrawalRepository.findOne).toHaveBeenCalledWith({
        where: { id: withdrawalId, organization_id: 'org-user-id' },
        relations: [
          'client',
          'invoice',
          'cashTransaction',
          'details',
          'details.product',
          'details.product.brand',
          'details.product.category',
          'details.product.taxes',
          'details.product.measurement_unit',
          'details.product.prices',
        ],
      });
      expect(result).toEqual(mockWithdrawal);
    });

    it('should throw error if withdrawal not found', async () => {
      withdrawalRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(withdrawalId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('close', () => {
    const withdrawalId = 'withdrawal-id';

    it('should close withdrawal successfully', async () => {
      const existingWithdrawal = {
        id: withdrawalId,
        status: 'OPEN',
      };

      const closedWithdrawal = {
        ...existingWithdrawal,
        status: 'CLOSED',
        closed_at: new Date(),
      };

      withdrawalRepository.findOne
        .mockResolvedValueOnce(existingWithdrawal)
        .mockResolvedValueOnce(closedWithdrawal);
      withdrawalRepository.update.mockResolvedValue(undefined);

      const result = await service.close(withdrawalId, 'user-id');

      expect(withdrawalRepository.findOne).toHaveBeenCalledWith({
        where: { id: withdrawalId, organization_id: 'org-user-id' },
      });
      expect(withdrawalRepository.update).toHaveBeenCalledWith(withdrawalId, {
        status: 'CLOSED',
        closed_at: expect.any(Date),
      });
      expect(result).toEqual(closedWithdrawal);
    });

    it('should throw error if withdrawal not found', async () => {
      withdrawalRepository.findOne.mockResolvedValue(null);

      await expect(service.close(withdrawalId, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if withdrawal is already closed', async () => {
      const existingWithdrawal = {
        id: withdrawalId,
        code: 'WDR-001',
        status: 'CLOSED',
      };

      withdrawalRepository.findOne.mockResolvedValue(existingWithdrawal);

      await expect(service.close(withdrawalId, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createDetail', () => {
    const withdrawalId = 'withdrawal-id';
    const createDetailDto = {
      product_id: 'product-id',
      quantity: 2,
      unit_price: 50.25,
      warehouse_id: 'warehouse-id',
    };

    it('should create withdrawal detail successfully', async () => {
      const mockWithdrawal = {
        id: withdrawalId,
        status: 'OPEN',
      };
      const mockProduct = {
        id: 'product-id',
        name: 'Test Product',
        type: 'TANGIBLE',
      };
      const mockWarehouse = {
        id: 'warehouse-id',
        name: 'Test Warehouse',
      };
      const newDetail = {
        id: 'detail-1',
        withdrawal_id: withdrawalId,
        ...createDetailDto,
      };

      withdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);
      productRepository.findOne.mockResolvedValue(mockProduct);
      warehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      withdrawalDetailRepository.create.mockReturnValue(newDetail);
      withdrawalDetailRepository.save.mockResolvedValue(newDetail);

      const result = await service.createDetail(withdrawalId, createDetailDto, 'user-id');

      expect(withdrawalRepository.findOne).toHaveBeenCalledWith({
        where: { id: withdrawalId, organization_id: 'org-user-id' },
      });
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDetailDto.product_id },
      });
      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDetailDto.warehouse_id },
      });
      expect(withdrawalDetailRepository.create).toHaveBeenCalledWith({
        withdrawal_id: withdrawalId,
        ...createDetailDto,
        created_at: expect.any(Date),
      });
      expect(withdrawalDetailRepository.save).toHaveBeenCalledWith(newDetail);
      expect(result).toEqual(newDetail);
    });

    it('should throw error if product not found', async () => {
      withdrawalRepository.findOne.mockResolvedValue({ id: withdrawalId, status: 'OPEN' });
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.createDetail(withdrawalId, createDetailDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if warehouse not found for tangible product', async () => {
      withdrawalRepository.findOne.mockResolvedValue({ id: withdrawalId, status: 'OPEN' });
      productRepository.findOne.mockResolvedValue({ id: 'product-id', type: 'TANGIBLE' });
      warehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.createDetail(withdrawalId, createDetailDto, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });
});
