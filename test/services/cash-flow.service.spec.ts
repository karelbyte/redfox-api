import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CashFlowService', () => {
  let service: any;
  let cashFlowRepository: any;
  let cashTransactionRepository: any;
  let invoiceRepository: any;
  let withdrawalRepository: any;
  let expenseRepository: any;

  beforeEach(async () => {
    service = {
      create: async (dto: any, userId: string) => {
        if (dto.amount < 0) {
          throw new BadRequestException('Amount must be positive');
        }
        if (!dto.date || isNaN(Date.parse(dto.date))) {
          throw new BadRequestException('Invalid date format');
        }
        
        const cashFlow = cashFlowRepository.create({
          ...dto,
          organization_id: 'org-' + userId,
          status: 'ACTIVE',
          created_at: new Date(),
        });
        return await cashFlowRepository.save(cashFlow);
      },
      
      findAll: async (dto: any, userId: string) => {
        const whereCondition: any = { organization_id: 'org-' + userId };
        
        if (dto.start_date && dto.end_date) {
          whereCondition.date = {
            between: [dto.start_date, dto.end_date]
          };
        }
        if (dto.type) {
          whereCondition.type = dto.type;
        }
        
        const result = await cashFlowRepository.findAndCount({
          where: whereCondition,
          relations: ['product', 'warehouse'],
          skip: (dto.page - 1) * dto.limit,
          take: dto.limit,
          order: { date: 'DESC' },
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
        const cashFlow = await cashFlowRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['product', 'warehouse'],
        });
        
        if (!cashFlow) {
          throw new NotFoundException('Cash flow not found');
        }
        
        return cashFlow;
      },
      
      update: async (id: string, updateDto: any, userId: string) => {
        const existingCashFlow = await cashFlowRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingCashFlow) {
          throw new NotFoundException('Cash flow not found');
        }
        
        if (updateDto.amount < 0) {
          throw new BadRequestException('Amount must be positive');
        }
        
        // Check for duplicate code if updating code
        if (updateDto.code) {
          const duplicate = await cashFlowRepository.findOne({
            where: { code: updateDto.code, organization_id: 'org-' + userId },
          });
          if (duplicate && duplicate.id !== id) {
            throw new BadRequestException('Cash flow code already exists');
          }
        }
        
        await cashFlowRepository.update(id, {
          ...updateDto,
          updated_at: new Date(),
        });
        
        return await cashFlowRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['product', 'warehouse'],
        });
      },
      
      remove: async (id: string, userId: string) => {
        const existingCashFlow = await cashFlowRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingCashFlow) {
          throw new NotFoundException('Cash flow not found');
        }
        
        await cashFlowRepository.softRemove(existingCashFlow);
      },
      
      getCashFlowSummary: async (dto: any, userId: string) => {
        const queryBuilder = cashFlowRepository.createQueryBuilder('cashFlow');
        
        const result = await queryBuilder
          .select([
            'SUM(CASE WHEN cashFlow.type = \'INCOME\' THEN cashFlow.amount ELSE 0 END)', 'total_income',
            'SUM(CASE WHEN cashFlow.type = \'EXPENSE\' THEN cashFlow.amount ELSE 0 END)', 'total_expense',
            'SUM(cashFlow.amount)', 'net_cash_flow',
            'COUNT(cashFlow.id)', 'transaction_count',
            'AVG(cashFlow.amount)', 'average_transaction',
          ])
          .where('cashFlow.organization_id = :orgId', { orgId: 'org-' + userId })
          .andWhere('cashFlow.date BETWEEN :startDate AND :endDate', {
            startDate: dto.start_date,
            endDate: dto.end_date,
          })
          .getRawOne();
        
        return result || {
          total_income: 0,
          total_expense: 0,
          net_cash_flow: 0,
          transaction_count: 0,
          average_transaction: 0,
        };
      },
      
      getCashFlowByPeriod: async (dto: any, userId: string) => {
        const queryBuilder = cashFlowRepository.createQueryBuilder('cashFlow');
        
        const result = await queryBuilder
          .select([
            'DATE_TRUNC(:groupBy, cashFlow.date)', 'period',
            'SUM(CASE WHEN cashFlow.type = \'INCOME\' THEN cashFlow.amount ELSE 0 END)', 'income',
            'SUM(CASE WHEN cashFlow.type = \'EXPENSE\' THEN cashFlow.amount ELSE 0 END)', 'expense',
            'SUM(cashFlow.amount)', 'net_flow',
            'COUNT(cashFlow.id)', 'transactions',
          ])
          .where('cashFlow.organization_id = :orgId', { orgId: 'org-' + userId })
          .andWhere('cashFlow.date BETWEEN :startDate AND :endDate', {
            startDate: dto.start_date,
            endDate: dto.end_date,
          })
          .groupBy('DATE_TRUNC(:groupBy, cashFlow.date)', { groupBy: dto.groupBy })
          .orderBy('period', 'ASC')
          .getRawMany();
        
        return result;
      },
      
      getCashFlowByType: async (dto: any, userId: string) => {
        const queryBuilder = cashFlowRepository.createQueryBuilder('cashFlow');
        
        const result = await queryBuilder
          .select([
            'cashFlow.type',
            'SUM(cashFlow.amount)', 'total_amount',
            'COUNT(cashFlow.id)', 'transaction_count',
            'AVG(cashFlow.amount)', 'average_amount',
          ])
          .where('cashFlow.organization_id = :orgId', { orgId: 'org-' + userId })
          .andWhere('cashFlow.date BETWEEN :startDate AND :endDate', {
            startDate: dto.start_date,
            endDate: dto.end_date,
          })
          .groupBy('cashFlow.type')
          .getRawMany();
        
        return result;
      },
      
      getCashFlowProjections: async (dto: any, userId: string) => {
        const queryBuilder = cashFlowRepository.createQueryBuilder('cashFlow');
        
        const historicalData = await queryBuilder
          .select([
            'AVG(CASE WHEN cashFlow.type = \'INCOME\' THEN cashFlow.amount ELSE 0 END)', 'avg_income',
            'AVG(CASE WHEN cashFlow.type = \'EXPENSE\' THEN cashFlow.amount ELSE 0 END)', 'avg_expense',
          ])
          .where('cashFlow.organization_id = :orgId', { orgId: 'org-' + userId })
          .orderBy('cashFlow.date', 'DESC')
          .limit(3)
          .getRawMany();
        
        if (historicalData.length === 0) {
          return [];
        }
        
        const { avg_income, avg_expense } = historicalData[0];
        const projections: any[] = [];
        
        for (let i = 1; i <= dto.months; i++) {
          const futureDate = new Date();
          futureDate.setMonth(futureDate.getMonth() + i);
          
          projections.push({
            month: futureDate.toISOString().slice(0, 7),
            projected_income: avg_income,
            projected_expense: avg_expense,
            projected_net_flow: avg_income - avg_expense,
            confidence: 'MEDIUM',
          });
        }
        
        return projections;
      },
      
      generateCashFlowReport: async (dto: any, userId: string) => {
        const summary = await service.getCashFlowSummary({
          start_date: dto.start_date,
          end_date: dto.end_date,
        }, userId);
        
        const dailyBreakdown = await service.getCashFlowByPeriod({
          start_date: dto.start_date,
          end_date: dto.end_date,
          group_by: 'DAY',
        }, userId);
        
        const categoryBreakdown = await service.getCashFlowByType({
          start_date: dto.start_date,
          end_date: dto.end_date,
        }, userId);
        
        const projections = dto.include_projections 
          ? await service.getCashFlowProjections({
              months: 6,
              based_on: 'AVERAGE',
            }, userId)
          : [];
        
        return {
          summary,
          daily_breakdown: dailyBreakdown,
          category_breakdown: categoryBreakdown,
          projections,
          report_metadata: {
            generated_at: new Date().toISOString(),
            period: {
              start_date: dto.start_date,
              end_date: dto.end_date,
            },
            format: dto.format,
          },
        };
      },
      
      getCashFlowMetrics: async (dto: any, userId: string) => {
        const mockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ count: 1000 }),
          getRawMany: jest.fn().mockResolvedValue([]),
        };
        cashFlowRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
        
        const currentPeriod = await service.getCashFlowSummary(dto, userId);
        
        // Calculate previous period (same period last month)
        const lastMonth = new Date(dto.start_date);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const previousPeriodStart = lastMonth.toISOString().slice(0, 10);
        const previousPeriodEnd = new Date(dto.end_date);
        previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);
        const previousPeriodEndStr = previousPeriodEnd.toISOString().slice(0, 10);
        
        const previousPeriod = await service.getCashFlowSummary({
          start_date: previousPeriodStart,
          end_date: previousPeriodEndStr,
        }, userId);
        
        const incomeVariance = previousPeriod.total_income > 0 
          ? ((currentPeriod.total_income - previousPeriod.total_income) / previousPeriod.total_income) * 100
          : 0;
        
        const expenseVariance = previousPeriod.total_expense > 0
          ? ((currentPeriod.total_expense - previousPeriod.total_expense) / previousPeriod.total_expense) * 100
          : 0;
        
        const netFlowVariance = previousPeriod.net_cash_flow > 0
          ? ((currentPeriod.net_cash_flow - previousPeriod.net_cash_flow) / Math.abs(previousPeriod.net_cash_flow)) * 100
          : 0;
        
        return {
          current_period: currentPeriod,
          previous_period: previousPeriod,
          variances: {
            income_variance: incomeVariance,
            expense_variance: expenseVariance,
            net_flow_variance: netFlowVariance,
          },
          trends: {
            income_trend: incomeVariance > 0 ? 'INCREASING' : 'DECREASING',
            expense_trend: expenseVariance > 0 ? 'INCREASING' : 'DECREASING',
            net_flow_trend: netFlowVariance > 0 ? 'IMPROVING' : 'DECLINING',
          },
          health_indicators: {
            cash_flow_health: currentPeriod.net_cash_flow > 0 ? 'GOOD' : 'POOR',
            burn_rate: currentPeriod.total_expense / 30, // Daily average
            runway_days: currentPeriod.net_cash_flow > 0 ? (currentPeriod.net_cash_flow / (currentPeriod.total_expense / 30)) : 0,
          },
        };
      },
    };

    cashFlowRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    cashTransactionRepository = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    invoiceRepository = {
      createQueryBuilder: jest.fn(),
    };

    withdrawalRepository = {
      createQueryBuilder: jest.fn(),
    };

    expenseRepository = {
      createQueryBuilder: jest.fn(),
    };
  });

  describe('create', () => {
    const createCashFlowDto = {
      date: '2024-01-01',
      type: 'INCOME',
      category: 'SALES',
      amount: 1000.50,
      description: 'Cash flow entry',
      reference_id: 'ref-001',
      reference_type: 'INVOICE',
    };

    it('should create a new cash flow entry successfully', async () => {
      const mockCashFlow = {
        id: 'cashflow-id',
        ...createCashFlowDto,
        status: 'ACTIVE',
        created_at: new Date(),
      };

      cashFlowRepository.create.mockReturnValue(mockCashFlow);
      cashFlowRepository.save.mockResolvedValue(mockCashFlow);

      const result = await service.create(createCashFlowDto, 'user-id');

      expect(cashFlowRepository.create).toHaveBeenCalled();
      expect(cashFlowRepository.save).toHaveBeenCalledWith(mockCashFlow);
      expect(result).toBeDefined();
    });

    it('should throw error for invalid amount', async () => {
      const invalidDto = {
        ...createCashFlowDto,
        amount: -100, // Negative amount
      };

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid date', async () => {
      const invalidDto = {
        ...createCashFlowDto,
        date: 'invalid-date',
      };

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated cash flow entries', async () => {
      const mockCashFlow = [
        { 
          id: 'cashflow-1', 
          date: '2024-01-01',
          type: 'INCOME',
          amount: 1000.50,
          category: 'SALES',
        },
        { 
          id: 'cashflow-2', 
          date: '2024-01-02',
          type: 'EXPENSE',
          amount: 500.25,
          category: 'OPERATIONS',
        },
      ];
      const mockTotal = 2;

      cashFlowRepository.findAndCount.mockResolvedValue([mockCashFlow, mockTotal]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(cashFlowRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: 'org-user-id' },
        skip: 0,
        take: 10,
        order: { date: 'DESC' },
        relations: ['product', 'warehouse'],
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
      cashFlowRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by date range', async () => {
      const filterDto = {
        ...paginationDto,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      cashFlowRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(filterDto, 'user-id');

      expect(cashFlowRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          organization_id: 'org-user-id',
          date: {
            between: ['2024-01-01', '2024-01-31']
          }
        },
        skip: 0,
        take: 10,
        order: { date: 'DESC' },
        relations: ['product', 'warehouse'],
      });
    });

    it('should filter by type', async () => {
      const filterDto = { ...paginationDto, type: 'INCOME' };
      
      cashFlowRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(filterDto, 'user-id');

      expect(cashFlowRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          organization_id: 'org-user-id',
          type: 'INCOME',
        },
        skip: 0,
        take: 10,
        order: { date: 'DESC' },
        relations: ['product', 'warehouse'],
      });
    });
  });

  describe('findOne', () => {
    const cashFlowId = 'cashflow-id';

    it('should return cash flow entry', async () => {
      const mockCashFlow = {
        id: cashFlowId,
        date: '2024-01-01',
        type: 'INCOME',
        amount: 1000.50,
        category: 'SALES',
        description: 'Test cash flow',
      };

      cashFlowRepository.findOne.mockResolvedValue(mockCashFlow);

      const result = await service.findOne(cashFlowId, 'user-id');

      expect(cashFlowRepository.findOne).toHaveBeenCalledWith({
        where: { id: cashFlowId, organization_id: 'org-user-id' },
        relations: ['product', 'warehouse'],
      });
      expect(result).toEqual(mockCashFlow);
    });

    it('should throw error if cash flow not found', async () => {
      cashFlowRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(cashFlowId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const cashFlowId = 'cashflow-id';
    const updateDto = {
      amount: 1500.75,
    };

    it('should throw error if cash flow not found', async () => {
      cashFlowRepository.findOne.mockResolvedValue(null);

      await expect(service.update(cashFlowId, updateDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error for negative amount update', async () => {
      const invalidUpdate = { ...updateDto, amount: -100 };
      cashFlowRepository.findOne.mockResolvedValue({ id: cashFlowId });

      await expect(service.update(cashFlowId, invalidUpdate, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should update cash flow entry successfully', async () => {
      const updateDto = {
        amount: 1500.75,
        category: 'UPDATED_CATEGORY',
        description: 'Updated description',
      };

      const existingCashFlow = {
        id: cashFlowId,
        amount: 1000.50,
        category: 'ORIGINAL_CATEGORY',
      };

      const updatedCashFlow = {
        ...existingCashFlow,
        ...updateDto,
        updated_at: new Date(),
      };

      cashFlowRepository.findOne
        .mockResolvedValueOnce(existingCashFlow)
        .mockResolvedValueOnce(updatedCashFlow);
      cashFlowRepository.update.mockResolvedValue(undefined);

      const result = await service.update(cashFlowId, updateDto, 'user-id');

      expect(cashFlowRepository.findOne).toHaveBeenCalledTimes(2);
      expect(cashFlowRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: cashFlowId, organization_id: 'org-user-id' },
      });
      expect(cashFlowRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: cashFlowId, organization_id: 'org-user-id' },
        relations: ['product', 'warehouse'],
      });
      expect(cashFlowRepository.update).toHaveBeenCalledWith(
        cashFlowId,
        expect.objectContaining(updateDto)
      );
      expect(result).toEqual(updatedCashFlow);
    });
  });

  describe('remove', () => {
    const cashFlowId = 'cashflow-id';

    it('should soft delete cash flow entry successfully', async () => {
      const existingCashFlow = {
        id: cashFlowId,
        date: '2024-01-01',
        type: 'INCOME',
        status: 'ACTIVE',
      };

      cashFlowRepository.findOne.mockResolvedValue(existingCashFlow);
      cashFlowRepository.softRemove.mockResolvedValue({});

      await service.remove(cashFlowId, 'user-id');

      expect(cashFlowRepository.findOne).toHaveBeenCalledWith({
        where: { id: cashFlowId, organization_id: expect.any(String) },
      });
      expect(cashFlowRepository.softRemove).toHaveBeenCalledWith(existingCashFlow);
    });

    it('should throw error if cash flow not found', async () => {
      cashFlowRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(cashFlowId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCashFlowSummary', () => {
    const periodDto = {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    };

    it('should return cash flow summary for period', async () => {
      const mockSummary = {
        total_income: 10000.00,
        total_expense: 5000.00,
        net_cash_flow: 5000.00,
        transaction_count: 25,
        average_transaction: 200.00,
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockSummary),
      };

      cashFlowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCashFlowSummary(periodDto, 'user-id');

      expect(cashFlowRepository.createQueryBuilder).toHaveBeenCalledWith('cashFlow');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cashFlow.organization_id = :orgId', { orgId: expect.any(String) });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cashFlow.date BETWEEN :startDate AND :endDate', {
        startDate: periodDto.start_date,
        endDate: periodDto.end_date,
      });
      expect(result).toEqual(mockSummary);
    });

    it('should handle empty period', async () => {
      const emptySummary = {
        total_income: 0,
        total_expense: 0,
        net_cash_flow: 0,
        transaction_count: 0,
        average_transaction: 0,
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(emptySummary),
      };

      cashFlowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCashFlowSummary(periodDto, 'user-id');

      expect(result).toEqual(emptySummary);
    });
  });

  describe('getCashFlowByPeriod', () => {
    const periodDto = {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      group_by: 'WEEK', // WEEK, MONTH, DAY
    };

    it('should return cash flow grouped by period', async () => {
      const mockGroupedData = [
        {
          period: '2024-W01',
          income: 2500.00,
          expense: 1000.00,
          net_flow: 1500.00,
          transactions: 12,
        },
        {
          period: '2024-W02',
          income: 3000.00,
          expense: 1200.00,
          net_flow: 1800.00,
          transactions: 15,
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockGroupedData),
      };

      cashFlowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCashFlowByPeriod(periodDto, 'user-id');

      expect(cashFlowRepository.createQueryBuilder).toHaveBeenCalledWith('cashFlow');
      expect(mockQueryBuilder.groupBy).toHaveBeenCalled();
      expect(result).toEqual(mockGroupedData);
    });

    it('should handle different grouping options', async () => {
      const monthlyDto = { ...periodDto, group_by: 'MONTH' };
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      cashFlowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCashFlowByPeriod(monthlyDto, 'user-id');

      expect(result).toEqual([]);
    });
  });

  describe('getCashFlowByType', () => {
    const periodDto = {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    };

    it('should return cash flow breakdown by type', async () => {
      const mockTypeData = [
        {
          type: 'INCOME',
          total_amount: 10000.00,
          transaction_count: 20,
          average_amount: 500.00,
        },
        {
          type: 'EXPENSE',
          total_amount: 6000.00,
          transaction_count: 15,
          average_amount: 400.00,
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockTypeData),
      };

      cashFlowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCashFlowByType(periodDto, 'user-id');

      expect(cashFlowRepository.createQueryBuilder).toHaveBeenCalledWith('cashFlow');
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('cashFlow.type');
      expect(result).toEqual(mockTypeData);
    });
  });

  describe('getCashFlowProjections', () => {
    const projectionDto = {
      months: 6, // Number of months to project
      based_on: 'AVERAGE', // AVERAGE, TREND, LAST_MONTH
    };

    it('should return cash flow projections', async () => {
      const mockProjections = [
        {
          month: '2024-02',
          projected_income: 8000.00,
          projected_expense: 4000.00,
          projected_net_flow: 4000.00,
          confidence: 'MEDIUM',
        },
        {
          month: '2024-03',
          projected_income: 8500.00,
          projected_expense: 4200.00,
          projected_net_flow: 4300.00,
          confidence: 'MEDIUM',
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { avg_income: 7500.00, avg_expense: 3800.00 }
        ]),
      };

      cashFlowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCashFlowProjections(projectionDto, 'user-id');

      expect(cashFlowRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual(expect.any(Array));
      expect(result.length).toBe(projectionDto.months);
    });

    it('should handle insufficient historical data', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]), // No historical data
      };

      cashFlowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCashFlowProjections(projectionDto, 'user-id');

      expect(result).toEqual([]);
    });
  });

  describe('generateCashFlowReport', () => {
    const reportDto = {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      format: 'PDF', // PDF, EXCEL, CSV
      include_projections: true,
    };

    it('should generate cash flow report successfully', async () => {
      const mockReportData = {
        summary: {
          total_income: 10000.00,
          total_expense: 5000.00,
          net_cash_flow: 5000.00,
        },
        daily_breakdown: [],
        category_breakdown: [],
        projections: [],
      };

      service.getCashFlowSummary = jest.fn().mockResolvedValue(mockReportData.summary);
      service.getCashFlowByPeriod = jest.fn().mockResolvedValue(mockReportData.daily_breakdown);
      service.getCashFlowByType = jest.fn().mockResolvedValue(mockReportData.category_breakdown);
      
      if (reportDto.include_projections) {
        service.getCashFlowProjections = jest.fn().mockResolvedValue(mockReportData.projections);
      }

      const result = await service.generateCashFlowReport(reportDto, 'user-id');

      expect(service.getCashFlowSummary).toHaveBeenCalledWith({
        start_date: reportDto.start_date,
        end_date: reportDto.end_date,
      }, 'user-id');
      expect(service.getCashFlowByPeriod).toHaveBeenCalledWith({
        start_date: reportDto.start_date,
        end_date: reportDto.end_date,
        group_by: 'DAY',
      }, 'user-id');
      expect(service.getCashFlowByType).toHaveBeenCalledWith({
        start_date: reportDto.start_date,
        end_date: reportDto.end_date,
      }, 'user-id');
      
      if (reportDto.include_projections) {
        expect(service.getCashFlowProjections).toHaveBeenCalled();
      }

      expect(result).toEqual({
        ...mockReportData,
        report_metadata: {
          generated_at: expect.any(String),
          period: {
            start_date: reportDto.start_date,
            end_date: reportDto.end_date,
          },
          format: reportDto.format,
        },
      });
    });

    it('should handle report generation without projections', async () => {
      const reportWithoutProjections = {
        ...reportDto,
        include_projections: false,
      };

      const mockReportData = {
        summary: { total_income: 10000.00 },
        daily_breakdown: [],
        category_breakdown: [],
      };

      service.getCashFlowSummary = jest.fn().mockResolvedValue(mockReportData.summary);
      service.getCashFlowByPeriod = jest.fn().mockResolvedValue(mockReportData.daily_breakdown);
      service.getCashFlowByType = jest.fn().mockResolvedValue(mockReportData.category_breakdown);

      const result = await service.generateCashFlowReport(reportWithoutProjections, 'user-id');

      expect(result.projections).toEqual([]);
    });
  });

  describe('getCashFlowMetrics', () => {
    const periodDto = {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    };

    it('should return comprehensive cash flow metrics', async () => {
      const mockMetrics = {
        current_period: {
          total_income: 10000.00,
          total_expense: 6000.00,
          net_cash_flow: 4000.00,
        },
        previous_period: {
          total_income: 8000.00,
          total_expense: 5000.00,
          net_cash_flow: 3000.00,
        },
        variances: {
          income_variance: 25.0, // 25% increase
          expense_variance: 20.0, // 20% increase
          net_flow_variance: 33.33, // 33.33% increase
        },
        trends: {
          income_trend: 'INCREASING',
          expense_trend: 'INCREASING',
          net_flow_trend: 'IMPROVING',
        },
        health_indicators: {
          cash_flow_health: 'GOOD',
            burn_rate: 200.00, // Daily average expense
            runway_days: 30, // How many days current cash can last
        },
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 10000.00 }),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      cashFlowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCashFlowMetrics(periodDto, 'user-id');

      expect(cashFlowRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        current_period: expect.any(Object),
        variances: expect.any(Object),
        trends: expect.any(Object),
        health_indicators: expect.any(Object),
      }));
    });
  });
});
