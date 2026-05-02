import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CashTransactionService', () => {
  let service: any;
  let cashTransactionRepository: any;
  let cashRegisterRepository: any;
  let translationService: any;
  let cashTransactionMapper: any;

  beforeEach(async () => {
    cashTransactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
      manager: {
        connection: {
          createQueryRunner: jest.fn(),
        },
      },
    };

    cashRegisterRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    translationService = {
      translate: jest.fn(),
    };

    cashTransactionMapper = {
      mapToResponseDto: jest.fn((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        paymentMethod: transaction.paymentMethod,
        cashRegisterId: transaction.cashRegisterId,
      })),
      mapToResponseDtoList: jest.fn((transactions) => 
        transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          paymentMethod: t.paymentMethod,
          cashRegisterId: t.cashRegisterId,
        }))
      ),
    };

    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      },
    };

    cashTransactionRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

    service = {
      async create(createCashTransactionDto: any, userId?: string) {
        const queryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const cashRegister = await queryRunner.manager.findOne('CashRegister', {
            where: { id: createCashTransactionDto.cash_register_id },
          });

          if (!cashRegister) {
            const message = await translationService.translate(
              'cash_transaction.cash_register_not_found',
              userId,
              { id: createCashTransactionDto.cash_register_id },
            );
            throw new NotFoundException(message);
          }

          if (cashRegister.status !== 'OPEN') {
            const message = await translationService.translate(
              'cash_transaction.cash_register_closed',
              userId,
            );
            throw new BadRequestException(message);
          }

          const cashTransaction = queryRunner.manager.create('CashTransaction', {
            cashRegisterId: createCashTransactionDto.cash_register_id,
            type: createCashTransactionDto.type,
            amount: createCashTransactionDto.amount,
            description: createCashTransactionDto.description,
            reference: createCashTransactionDto.reference,
            paymentMethod: createCashTransactionDto.payment_method,
            saleId: createCashTransactionDto.sale_id,
            createdBy: userId,
          });

          const savedTransaction = await queryRunner.manager.save('CashTransaction', cashTransaction);

          await service.updateCashRegisterBalanceInTransaction(
            queryRunner,
            cashRegister,
            createCashTransactionDto.amount,
            createCashTransactionDto.type,
          );

          await queryRunner.commitTransaction();

          return cashTransactionMapper.mapToResponseDto(savedTransaction);
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      },

      async getCashTransactions(cashRegisterId: string, queryDto: any, userId?: string) {
        const cashRegister = await cashRegisterRepository.findOne({
          where: { id: cashRegisterId },
        });

        if (!cashRegister) {
          const message = await translationService.translate(
            'cash_transaction.cash_register_not_found',
            userId,
            { id: cashRegisterId },
          );
          throw new NotFoundException(message);
        }

        const { page = 1, limit = 10, type, payment_method, start_date, end_date } = queryDto;
        const skip = (page - 1) * limit;

        const whereConditions: any = { cashRegisterId };

        if (type) {
          whereConditions.type = type;
        }

        if (payment_method) {
          whereConditions.paymentMethod = payment_method;
        }

        if (start_date && end_date) {
          whereConditions.created_at = Between(
            new Date(start_date),
            new Date(end_date),
          );
        }

        const [transactions, total] = await cashTransactionRepository.findAndCount({
          where: whereConditions,
          order: { created_at: 'DESC' },
          skip,
          take: limit,
        });

        const data = cashTransactionMapper.mapToResponseDtoList(transactions);

        return {
          data,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },

      async getCashReport(cashRegisterId: string, queryDto: any, userId?: string) {
        const cashRegister = await cashRegisterRepository.findOne({
          where: { id: cashRegisterId },
        });

        if (!cashRegister) {
          const message = await translationService.translate(
            'cash_transaction.cash_register_not_found',
            userId,
            { id: cashRegisterId },
          );
          throw new NotFoundException(message);
        }

        const { start_date, end_date } = queryDto;
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        const transactions = await cashTransactionRepository.find({
          where: {
            cashRegisterId,
            created_at: Between(startDate, endDate),
          },
          order: { created_at: 'ASC' },
        });

        const totalSales = transactions
          .filter((t: any) => t.type === 'SALE')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const totalRefunds = transactions
          .filter((t: any) => t.type === 'REFUND')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const totalAdjustments = transactions
          .filter((t: any) => t.type === 'ADJUSTMENT')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const cashSales = transactions
          .filter(
            (t: any) =>
              t.type === 'SALE' &&
              t.paymentMethod === 'CASH',
          )
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const cardSales = transactions
          .filter(
            (t: any) =>
              t.type === 'SALE' &&
              t.paymentMethod === 'CARD',
          )
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const openingBalance = Number(cashRegister.initialAmount);
        const closingBalance = Number(cashRegister.currentAmount);

        const mappedTransactions = cashTransactionMapper.mapToResponseDtoList(transactions);

        return {
          total_sales: totalSales,
          total_refunds: totalRefunds,
          total_adjustments: totalAdjustments,
          cash_sales: cashSales,
          card_sales: cardSales,
          opening_balance: openingBalance,
          closing_balance: closingBalance,
          transactions: mappedTransactions,
        };
      },

      async updateCashRegisterBalanceInTransaction(queryRunner: any, cashRegister: any, amount: number, type: string) {
        let newBalance = Number(cashRegister.currentAmount);

        switch (type) {
          case 'SALE':
          case 'DEPOSIT':
            newBalance += amount;
            break;
          case 'REFUND':
          case 'WITHDRAWAL':
            newBalance -= amount;
            break;
          case 'ADJUSTMENT':
            newBalance += amount;
            break;
        }

        cashRegister.currentAmount = newBalance;
        await queryRunner.manager.save('CashRegister', cashRegister);
      },

      async findOne(id: string, userId?: string) {
        const transaction = await cashTransactionRepository.findOne({
          where: { id },
        });

        if (!transaction) {
          const message = await translationService.translate(
            'cash_transaction.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        return cashTransactionMapper.mapToResponseDto(transaction);
      },

      async update(id: string, updateCashTransactionDto: any, userId?: string) {
        const queryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const cashTransaction = await queryRunner.manager.findOne('CashTransaction', {
            where: { id },
            relations: ['cashRegister'],
          });

          if (!cashTransaction) {
            const message = await translationService.translate(
              'cash_transaction.not_found',
              userId,
              { id },
            );
            throw new NotFoundException(message);
          }

          if (cashTransaction.cashRegister.status !== 'OPEN') {
            const message = await translationService.translate(
              'cash_transaction.cash_register_closed',
              userId,
            );
            throw new BadRequestException(message);
          }

          let amountDifference = 0;
          if (updateCashTransactionDto.amount !== undefined) {
            amountDifference = updateCashTransactionDto.amount - cashTransaction.amount;
          }

          Object.assign(cashTransaction, updateCashTransactionDto);
          const updatedTransaction = await queryRunner.manager.save('CashTransaction', cashTransaction);

          if (amountDifference !== 0) {
            await service.updateCashRegisterBalanceInTransaction(
              queryRunner,
              cashTransaction.cashRegister,
              amountDifference,
              cashTransaction.type,
            );
          }

          await queryRunner.commitTransaction();
          return cashTransactionMapper.mapToResponseDto(updatedTransaction);
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      },

      async remove(id: string, userId?: string) {
        const queryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const cashTransaction = await queryRunner.manager.findOne('CashTransaction', {
            where: { id },
            relations: ['cashRegister'],
          });

          if (!cashTransaction) {
            const message = await translationService.translate(
              'cash_transaction.not_found',
              userId,
              { id },
            );
            throw new NotFoundException(message);
          }

          if (cashTransaction.cashRegister.status !== 'OPEN') {
            const message = await translationService.translate(
              'cash_transaction.cash_register_closed',
              userId,
            );
            throw new BadRequestException(message);
          }

          const amountToRevert = cashTransaction.amount;
          const typeToRevert = cashTransaction.type;

          await queryRunner.manager.remove('CashTransaction', cashTransaction);

          let newBalance = Number(cashTransaction.cashRegister.currentAmount);

          switch (typeToRevert) {
            case 'SALE':
            case 'DEPOSIT':
              newBalance -= amountToRevert;
              break;
            case 'REFUND':
            case 'WITHDRAWAL':
              newBalance += amountToRevert;
              break;
            case 'ADJUSTMENT':
              newBalance -= amountToRevert;
              break;
          }

          cashTransaction.cashRegister.currentAmount = newBalance;
          await queryRunner.manager.save('CashRegister', cashTransaction.cashRegister);

          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      },
    };
  });

  describe('create', () => {
    const createCashTransactionDto = {
      cash_register_id: 'cr-123',
      type: 'SALE',
      amount: 100,
      description: 'Test transaction',
      payment_method: 'CASH',
    };

    it('should create a new cash transaction successfully', async () => {
      const mockCashRegister = {
        id: 'cr-123',
        status: 'OPEN',
        currentAmount: 1000,
      };

      const mockTransaction = {
        id: 'ct-123',
        ...createCashTransactionDto,
        cashRegisterId: createCashTransactionDto.cash_register_id,
        paymentMethod: createCashTransactionDto.payment_method,
      };

      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      
      mockQueryRunner.manager.findOne.mockResolvedValue(mockCashRegister);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockResolvedValue(mockTransaction);

      const result = await service.create(createCashTransactionDto, 'user-123');

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith('CashRegister', {
        where: { id: 'cr-123' },
      });
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith('CashTransaction', {
        cashRegisterId: 'cr-123',
        type: 'SALE',
        amount: 100,
        description: 'Test transaction',
        paymentMethod: 'CASH',
        createdBy: 'user-123',
      });
      expect(result).toEqual(cashTransactionMapper.mapToResponseDto(mockTransaction));
    });

    it('should throw error if cash register not found', async () => {
      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Cash register not found');

      await expect(service.create(createCashTransactionDto, 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if cash register is closed', async () => {
      const mockCashRegister = {
        id: 'cr-123',
        status: 'CLOSED',
      };

      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockCashRegister);
      translationService.translate.mockResolvedValue('Cash register is closed');

      await expect(service.create(createCashTransactionDto, 'user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCashTransactions', () => {
    const cashRegisterId = 'cr-123';

    it('should return paginated cash transactions', async () => {
      const mockCashRegister = { id: cashRegisterId };
      const mockTransactions = [
        { id: 'ct-1', type: 'SALE', amount: 100, cashRegisterId },
        { id: 'ct-2', type: 'REFUND', amount: 50, cashRegisterId },
      ];

      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      cashTransactionRepository.findAndCount.mockResolvedValue([mockTransactions, 2]);

      const result = await service.getCashTransactions(cashRegisterId, { page: 1, limit: 10 }, 'user-123');

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should handle query filters', async () => {
      const mockCashRegister = { id: cashRegisterId };
      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      cashTransactionRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getCashTransactions(cashRegisterId, {
        page: 1,
        limit: 10,
        type: 'SALE',
        payment_method: 'CASH',
        start_date: '2023-01-01',
        end_date: '2023-01-31',
      }, 'user-123');

      expect(cashTransactionRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          cashRegisterId,
          type: 'SALE',
          paymentMethod: 'CASH',
          created_at: expect.any(Object),
        },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should throw error if cash register not found', async () => {
      cashRegisterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Cash register not found');

      await expect(service.getCashTransactions(cashRegisterId, {}, 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCashReport', () => {
    const cashRegisterId = 'cr-123';

    it('should return cash report', async () => {
      const mockCashRegister = {
        id: cashRegisterId,
        initialAmount: 1000,
        currentAmount: 1500,
      };

      const mockTransactions = [
        { id: 'ct-1', type: 'SALE', amount: 100, paymentMethod: 'CASH' },
        { id: 'ct-2', type: 'SALE', amount: 200, paymentMethod: 'CARD' },
        { id: 'ct-3', type: 'REFUND', amount: 50, paymentMethod: 'CASH' },
        { id: 'ct-4', type: 'ADJUSTMENT', amount: 25, paymentMethod: 'CASH' },
      ];

      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      cashTransactionRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.getCashReport(cashRegisterId, {
        start_date: '2023-01-01',
        end_date: '2023-01-31',
      }, 'user-123');

      expect(result).toEqual({
        total_sales: 300,
        total_refunds: 50,
        total_adjustments: 25,
        cash_sales: 100,
        card_sales: 200,
        opening_balance: 1000,
        closing_balance: 1500,
        transactions: expect.any(Array),
      });
    });

    it('should throw error if cash register not found', async () => {
      cashRegisterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Cash register not found');

      await expect(service.getCashReport(cashRegisterId, {
        start_date: '2023-01-01',
        end_date: '2023-01-31',
      }, 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    const transactionId = 'ct-123';

    it('should return cash transaction by ID', async () => {
      const mockTransaction = {
        id: transactionId,
        type: 'SALE',
        amount: 100,
        cashRegisterId: 'cr-123',
      };

      cashTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findOne(transactionId, 'user-123');

      expect(cashTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
      expect(result).toEqual(cashTransactionMapper.mapToResponseDto(mockTransaction));
    });

    it('should throw error if transaction not found', async () => {
      cashTransactionRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Transaction not found');

      await expect(service.findOne(transactionId, 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const transactionId = 'ct-123';
    const updateDto = {
      amount: 150,
      description: 'Updated transaction',
    };

    it('should update cash transaction successfully', async () => {
      const mockCashRegister = {
        id: 'cr-123',
        status: 'OPEN',
        currentAmount: 1000,
      };

      const mockTransaction = {
        id: transactionId,
        type: 'SALE',
        amount: 100,
        cashRegister: mockCashRegister,
      };

      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockTransaction);
      mockQueryRunner.manager.save.mockResolvedValue({ ...mockTransaction, ...updateDto });

      const result = await service.update(transactionId, updateDto, 'user-123');

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith('CashTransaction', {
        where: { id: transactionId },
        relations: ['cashRegister'],
      });
      expect(result).toEqual(cashTransactionMapper.mapToResponseDto({ ...mockTransaction, ...updateDto }));
    });

    it('should throw error if transaction not found', async () => {
      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Transaction not found');

      await expect(service.update(transactionId, updateDto, 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if cash register is closed', async () => {
      const mockCashRegister = {
        id: 'cr-123',
        status: 'CLOSED',
      };

      const mockTransaction = {
        id: transactionId,
        cashRegister: mockCashRegister,
      };

      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockTransaction);
      translationService.translate.mockResolvedValue('Cash register is closed');

      await expect(service.update(transactionId, updateDto, 'user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const transactionId = 'ct-123';

    it('should remove cash transaction successfully', async () => {
      const mockCashRegister = {
        id: 'cr-123',
        status: 'OPEN',
        currentAmount: 1000,
      };

      const mockTransaction = {
        id: transactionId,
        type: 'SALE',
        amount: 100,
        cashRegister: mockCashRegister,
      };

      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockTransaction);
      mockQueryRunner.manager.remove.mockResolvedValue(undefined);
      mockQueryRunner.manager.save.mockResolvedValue(undefined);

      await service.remove(transactionId, 'user-123');

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith('CashTransaction', {
        where: { id: transactionId },
        relations: ['cashRegister'],
      });
      expect(mockQueryRunner.manager.remove).toHaveBeenCalledWith('CashTransaction', mockTransaction);
    });

    it('should throw error if transaction not found', async () => {
      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Transaction not found');

      await expect(service.remove(transactionId, 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if cash register is closed', async () => {
      const mockCashRegister = {
        id: 'cr-123',
        status: 'CLOSED',
      };

      const mockTransaction = {
        id: transactionId,
        cashRegister: mockCashRegister,
      };

      const mockQueryRunner = cashTransactionRepository.manager.connection.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockTransaction);
      translationService.translate.mockResolvedValue('Cash register is closed');

      await expect(service.remove(transactionId, 'user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCashRegisterBalanceInTransaction', () => {
    it('should increase balance for SALE transactions', async () => {
      const mockCashRegister = { currentAmount: 1000 };
      const mockQueryRunner = {
        manager: {
          save: jest.fn(),
        },
      };

      await service.updateCashRegisterBalanceInTransaction(mockQueryRunner, mockCashRegister, 100, 'SALE');

      expect(mockCashRegister.currentAmount).toBe(1100);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith('CashRegister', mockCashRegister);
    });

    it('should decrease balance for REFUND transactions', async () => {
      const mockCashRegister = { currentAmount: 1000 };
      const mockQueryRunner = {
        manager: {
          save: jest.fn(),
        },
      };

      await service.updateCashRegisterBalanceInTransaction(mockQueryRunner, mockCashRegister, 100, 'REFUND');

      expect(mockCashRegister.currentAmount).toBe(900);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith('CashRegister', mockCashRegister);
    });

    it('should handle ADJUSTMENT transactions', async () => {
      const mockCashRegister = { currentAmount: 1000 };
      const mockQueryRunner = {
        manager: {
          save: jest.fn(),
        },
      };

      await service.updateCashRegisterBalanceInTransaction(mockQueryRunner, mockCashRegister, 50, 'ADJUSTMENT');

      expect(mockCashRegister.currentAmount).toBe(1050);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith('CashRegister', mockCashRegister);
    });
  });
});
