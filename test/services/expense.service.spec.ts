import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ExpenseService', () => {
  let service: any;
  let expenseRepository: any;
  let paymentRepository: any;
  let tenantContext: any;

  beforeEach(async () => {
    expenseRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
    };

    paymentRepository = {
      insert: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    };

    service = {
      async create(createExpenseDto: any, userId: string) {
        const totalAmount = Number(createExpenseDto.amount);
        const expense = expenseRepository.create({
          ...createExpenseDto,
          organization_id: tenantContext.getOrganizationId(),
          createdBy: userId,
          amount: totalAmount,
          paidAmount: 0,
          remainingAmount: totalAmount,
        });
        return await expenseRepository.save(expense);
      },

      async findAll(
        page: number = 1,
        limit: number = 10,
        search?: string,
        status?: any,
        categoryId?: string,
        startDate?: string,
        endDate?: string,
      ) {
        const mockQueryBuilder = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(1),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([{
            id: 'expense-1',
            description: 'Test Expense',
            amount: 100,
          }]),
        };

        const qb = { ...mockQueryBuilder };
        expenseRepository.createQueryBuilder('expense');

        const total = await qb.getCount();
        const expenses = await qb.getMany();

        return {
          data: expenses,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      },

      async findOne(id: string) {
        const expense = await expenseRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          relations: [
            'category',
            'provider',
            'createdByUser',
            'payments',
            'payments.createdByUser',
          ],
        });

        if (!expense) {
          throw new NotFoundException(`Expense with ID ${id} not found`);
        }

        return expense;
      },

      async update(id: string, updateExpenseDto: any) {
        const expense = await service.findOne(id);
        Object.assign(expense, updateExpenseDto);
        return await expenseRepository.save(expense);
      },

      async remove(id: string) {
        const expense = await service.findOne(id);
        await expenseRepository.remove(expense);
      },

      async removeMany(ids: string[]) {
        const mockQueryBuilder = {
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        };

        const qb = { ...mockQueryBuilder };
        expenseRepository.createQueryBuilder();
        await qb.execute();
      },

      async getExpensesSummary(startDate?: string, endDate?: string) {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            { id: '1', amount: 100, status: 'PAID' },
            { id: '2', amount: 50, status: 'PENDING' },
          ]),
        };

        const qb = { ...mockQueryBuilder };
        expenseRepository.createQueryBuilder('expense');
        const expenses = await qb.getMany();

        const summary = expenses.reduce(
          (acc, expense) => {
            acc.totalExpenses++;
            acc.totalAmount += Number(expense.amount);

            if (expense.status === 'PAID') {
              acc.paidExpenses++;
              acc.paidAmount += Number(expense.amount);
            } else {
              acc.pendingExpenses++;
              acc.pendingAmount += Number(expense.amount);
            }

            return acc;
          },
          {
            totalExpenses: 0,
            paidExpenses: 0,
            pendingExpenses: 0,
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
          },
        );

        return summary;
      },

      async getMonthlyExpenses(year: number) {
        const mockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([
            { month: 1, totalAmount: 100, expenseCount: 2 },
            { month: 2, totalAmount: 150, expenseCount: 3 },
          ]),
        };

        const qb = { ...mockQueryBuilder };
        expenseRepository.createQueryBuilder('expense');
        return await qb.getRawMany();
      },

      async getExpensesByCategory(startDate?: string, endDate?: string) {
        const mockQueryBuilder = {
          leftJoin: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([
            { categoryName: 'Office', categoryColor: '#FF0000', totalAmount: 200, expenseCount: 4 },
            { categoryName: 'Travel', categoryColor: '#00FF00', totalAmount: 150, expenseCount: 2 },
          ]),
        };

        const qb = { ...mockQueryBuilder };
        expenseRepository.createQueryBuilder('expense');
        return await qb.getRawMany();
      },

      async addPayment(createPaymentDto: any, userId: string) {
        if (!createPaymentDto.expenseId) {
          throw new BadRequestException('Expense ID is required');
        }

        const expense = await service.findOne(createPaymentDto.expenseId);

        if (createPaymentDto.amount > expense.remainingAmount) {
          throw new BadRequestException(
            'Payment amount cannot exceed remaining amount',
          );
        }

        const organizationId = tenantContext.getOrganizationId();

        const insertResult = await paymentRepository.insert({
          organization_id: organizationId,
          amount: createPaymentDto.amount,
          paymentDate: createPaymentDto.paymentDate,
          paymentMethod: createPaymentDto.paymentMethod,
          reference: createPaymentDto.reference,
          notes: createPaymentDto.notes,
          expenseId: createPaymentDto.expenseId,
          createdBy: userId,
        });

        const savedPayment = await paymentRepository.findOne({
          where: { id: insertResult.identifiers[0].id },
          relations: ['createdByUser'],
        });

        if (!savedPayment) {
          throw new NotFoundException('Payment could not be created');
        }

        const currentPaidAmount = Number(expense.paidAmount);
        const currentRemainingAmount = Number(expense.remainingAmount);
        const paymentAmount = Number(createPaymentDto.amount);

        expense.paidAmount = Number((currentPaidAmount + paymentAmount).toFixed(2));
        expense.remainingAmount = Number(
          (currentRemainingAmount - paymentAmount).toFixed(2),
        );

        if (expense.remainingAmount === 0) {
          expense.status = 'PAID';
        }

        await expenseRepository.update(expense.id, {
          paidAmount: expense.paidAmount,
          remainingAmount: expense.remainingAmount,
          status: expense.status,
        });

        return savedPayment;
      },

      async getPayments(expenseId: string) {
        const expense = await service.findOne(expenseId);

        return await paymentRepository.find({
          where: {
            expenseId: expense.id,
            organization_id: tenantContext.getOrganizationId(),
          },
          relations: ['createdByUser'],
          order: { paymentDate: 'DESC' },
        });
      },
    };
  });

  describe('create', () => {
    const createExpenseDto = {
      description: 'Office Supplies',
      amount: 100,
      expenseDate: '2023-01-01',
      categoryId: 'category-1',
    };

    it('should create a new expense successfully', async () => {
      const mockExpense = {
        id: 'expense-123',
        ...createExpenseDto,
        organization_id: 'org-123',
        createdBy: 'user-123',
        paidAmount: 0,
        remainingAmount: 100,
      };

      expenseRepository.create.mockReturnValue(mockExpense);
      expenseRepository.save.mockResolvedValue(mockExpense);

      const result = await service.create(createExpenseDto, 'user-123');

      expect(expenseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createExpenseDto,
          organization_id: 'org-123',
          createdBy: 'user-123',
          amount: 100,
          paidAmount: 0,
          remainingAmount: 100,
        })
      );
      expect(result).toEqual(mockExpense);
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses', async () => {
      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should handle search parameters', async () => {
      const result = await service.findAll(1, 10, 'test', 'PAID', 'cat-1', '2023-01-01', '2023-01-31');

      expect(result).toBeDefined();
      expect(expenseRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const expenseId = 'expense-123';

    it('should return expense by ID', async () => {
      const mockExpense = {
        id: expenseId,
        description: 'Test Expense',
        amount: 100,
        category: { id: 'cat-1', name: 'Office' },
        provider: { id: 'prov-1', name: 'Provider' },
        createdByUser: { id: 'user-1', name: 'User' },
        payments: [],
      };

      expenseRepository.findOne.mockResolvedValue(mockExpense);

      const result = await service.findOne(expenseId);

      expect(expenseRepository.findOne).toHaveBeenCalledWith({
        where: { id: expenseId, organization_id: 'org-123' },
        relations: [
          'category',
          'provider',
          'createdByUser',
          'payments',
          'payments.createdByUser',
        ],
      });
      expect(result).toEqual(mockExpense);
    });

    it('should throw error if expense not found', async () => {
      expenseRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(expenseId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const expenseId = 'expense-123';
    const updateExpenseDto = {
      description: 'Updated Expense',
      amount: 150,
    };

    it('should update expense successfully', async () => {
      const mockExpense = {
        id: expenseId,
        description: 'Test Expense',
        amount: 100,
      };

      const updatedExpense = {
        ...mockExpense,
        ...updateExpenseDto,
      };

      expenseRepository.findOne.mockResolvedValue(mockExpense);
      expenseRepository.save.mockResolvedValue(updatedExpense);

      const result = await service.update(expenseId, updateExpenseDto);

      expect(expenseRepository.save).toHaveBeenCalledWith(updatedExpense);
      expect(result).toEqual(updatedExpense);
    });
  });

  describe('remove', () => {
    const expenseId = 'expense-123';

    it('should remove expense successfully', async () => {
      const mockExpense = {
        id: expenseId,
        description: 'Test Expense',
      };

      expenseRepository.findOne.mockResolvedValue(mockExpense);
      expenseRepository.remove.mockResolvedValue(undefined);

      await service.remove(expenseId);

      expect(expenseRepository.remove).toHaveBeenCalledWith(mockExpense);
    });
  });

  describe('removeMany', () => {
    it('should remove multiple expenses', async () => {
      await service.removeMany(['expense-1', 'expense-2']);

      expect(expenseRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getExpensesSummary', () => {
    it('should return expenses summary', async () => {
      const result = await service.getExpensesSummary();

      expect(result).toEqual({
        totalExpenses: 2,
        paidExpenses: 1,
        pendingExpenses: 1,
        totalAmount: 150,
        paidAmount: 100,
        pendingAmount: 50,
      });
    });

    it('should handle date range', async () => {
      const result = await service.getExpensesSummary('2023-01-01', '2023-01-31');

      expect(result).toBeDefined();
      expect(expenseRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getMonthlyExpenses', () => {
    it('should return monthly expenses', async () => {
      const result = await service.getMonthlyExpenses(2023);

      expect(result).toEqual([
        { month: 1, totalAmount: 100, expenseCount: 2 },
        { month: 2, totalAmount: 150, expenseCount: 3 },
      ]);
    });

    it('should query by year', async () => {
      const result = await service.getMonthlyExpenses(2023);

      expect(result).toBeDefined();
      expect(expenseRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getExpensesByCategory', () => {
    it('should return expenses by category', async () => {
      const result = await service.getExpensesByCategory();

      expect(result).toEqual([
        { categoryName: 'Office', categoryColor: '#FF0000', totalAmount: 200, expenseCount: 4 },
        { categoryName: 'Travel', categoryColor: '#00FF00', totalAmount: 150, expenseCount: 2 },
      ]);
    });

    it('should handle date range', async () => {
      const result = await service.getExpensesByCategory('2023-01-01', '2023-01-31');

      expect(result).toBeDefined();
      expect(expenseRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('addPayment', () => {
    const createPaymentDto = {
      expenseId: 'expense-123',
      amount: 50,
      paymentDate: '2023-01-15',
      paymentMethod: 'CASH',
      reference: 'REF-001',
      notes: 'Partial payment',
    };

    it('should add payment successfully', async () => {
      const mockExpense = {
        id: 'expense-123',
        amount: 100,
        paidAmount: 0,
        remainingAmount: 100,
        status: 'PENDING',
      };

      const mockPayment = {
        id: 'payment-123',
        ...createPaymentDto,
        organization_id: 'org-123',
        createdBy: 'user-123',
      };

      expenseRepository.findOne.mockResolvedValue(mockExpense);
      paymentRepository.insert.mockResolvedValue({ identifiers: [{ id: 'payment-123' }] });
      paymentRepository.findOne.mockResolvedValue(mockPayment);
      expenseRepository.update.mockResolvedValue(undefined);

      const result = await service.addPayment(createPaymentDto, 'user-123');

      expect(paymentRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createPaymentDto,
          organization_id: 'org-123',
          createdBy: 'user-123',
        })
      );
      expect(result).toEqual(mockPayment);
    });

    it('should throw error if expense ID is missing', async () => {
      const invalidDto = { ...createPaymentDto, expenseId: undefined };

      await expect(service.addPayment(invalidDto, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if payment amount exceeds remaining amount', async () => {
      const mockExpense = {
        id: 'expense-123',
        amount: 100,
        paidAmount: 80,
        remainingAmount: 20,
      };

      expenseRepository.findOne.mockResolvedValue(mockExpense);

      await expect(service.addPayment({ ...createPaymentDto, amount: 30 }, 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should mark expense as paid when fully paid', async () => {
      const mockExpense = {
        id: 'expense-123',
        amount: 100,
        paidAmount: 80,
        remainingAmount: 20,
        status: 'PENDING',
      };

      expenseRepository.findOne.mockResolvedValue(mockExpense);
      paymentRepository.insert.mockResolvedValue({ identifiers: [{ id: 'payment-123' }] });
      paymentRepository.findOne.mockResolvedValue({ id: 'payment-123' });
      expenseRepository.update.mockResolvedValue(undefined);

      await service.addPayment({ ...createPaymentDto, amount: 20 }, 'user-123');

      expect(expenseRepository.update).toHaveBeenCalledWith('expense-123', {
        paidAmount: 100,
        remainingAmount: 0,
        status: 'PAID',
      });
    });
  });

  describe('getPayments', () => {
    const expenseId = 'expense-123';

    it('should return payments for expense', async () => {
      const mockExpense = {
        id: expenseId,
        description: 'Test Expense',
      };

      const mockPayments = [
        { id: 'payment-1', amount: 50, paymentDate: '2023-01-15' },
        { id: 'payment-2', amount: 50, paymentDate: '2023-01-20' },
      ];

      expenseRepository.findOne.mockResolvedValue(mockExpense);
      paymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getPayments(expenseId);

      expect(paymentRepository.find).toHaveBeenCalledWith({
        where: {
          expenseId: expenseId,
          organization_id: 'org-123',
        },
        relations: ['createdByUser'],
        order: { paymentDate: 'DESC' },
      });
      expect(result).toEqual(mockPayments);
    });
  });
});
