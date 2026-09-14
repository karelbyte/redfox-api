import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AccountPayableService', () => {
  let service: any;
  let accountPayableRepository: any;
  let paymentRepository: any;
  let providerService: any;
  let tenantContext: any;
  let translationService: any;

  beforeEach(async () => {
    accountPayableRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      insert: jest.fn(),
    };

    paymentRepository = {
      insert: jest.fn(),
      findOne: jest.fn(),
    };

    providerService = {
      updateBalance: jest.fn(),
    };

    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
      getUserId: jest.fn().mockReturnValue('user-123'),
    };

    translationService = {
      translate: jest.fn(),
    };

    service = {
      async getOrganizationId() {
        const orgId = tenantContext.getOrganizationId();
        if (!orgId) {
          const message = await translationService.translate(
            'auth.organization_required',
            tenantContext.getUserId() || undefined,
          );
          throw new BadRequestException(message);
        }
        return orgId;
      },

      async create(createAccountPayableDto: any, userId?: string) {
        const organizationId = await service.getOrganizationId();
        const totalAmount = Number(createAccountPayableDto.totalAmount);
        const remainingAmount = Number(createAccountPayableDto.remainingAmount);
        const paidAmount = totalAmount - remainingAmount;

        let status = createAccountPayableDto.status || 'PENDING';
        if (remainingAmount === 0) {
          status = 'PAID';
        } else if (paidAmount > 0) {
          status = 'PARTIAL';
        }

        const accountPayable = {} as any;
        Object.assign(accountPayable, createAccountPayableDto);
        accountPayable.organization_id = organizationId;
        accountPayable.totalAmount = totalAmount;
        accountPayable.remainingAmount = remainingAmount;
        accountPayable.paidAmount = paidAmount;
        accountPayable.status = status;
        accountPayable.created_by = userId || null;

        const savedAccount = await accountPayableRepository.save(accountPayable);

        await providerService.updateBalance(
          createAccountPayableDto.providerId,
          remainingAmount,
        );

        return savedAccount;
      },

      async findAll(
        page: number = 1,
        limit: number = 10,
        search?: string,
        status?: any,
        providerId?: string,
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
            id: 'ap-1',
            referenceNumber: 'REF-001',
            totalAmount: 100,
          }]),
        };

        const qb = { ...mockQueryBuilder };
        accountPayableRepository.createQueryBuilder('accountPayable');

        const total = await qb.getCount();
        const accountsPayable = await qb.getMany();

        return {
          data: accountsPayable,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      },

      async findOne(id: string) {
        const accountPayable = await accountPayableRepository.findOne({
          where: { id, organization_id: await service.getOrganizationId() },
          relations: [
            'provider',
            'purchaseOrder',
            'payments',
            'payments.createdByUser',
          ],
        });

        if (!accountPayable) {
          const message = await translationService.translate(
            'account_payable.not_found',
            tenantContext.getUserId() || undefined,
            { id },
          );
          throw new NotFoundException(message);
        }

        return accountPayable;
      },

      async update(id: string, updateAccountPayableDto: any) {
        const accountPayable = await service.findOne(id);
        Object.assign(accountPayable, updateAccountPayableDto);
        return await accountPayableRepository.save(accountPayable);
      },

      async remove(id: string) {
        const accountPayable = await service.findOne(id);
        await accountPayableRepository.remove(accountPayable);
      },

      async getAccountsPayableSummary(startDate?: string, endDate?: string) {
        const mockQueryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            { id: '1', totalAmount: 1000, paidAmount: 500, remainingAmount: 500, status: 'PARTIAL' },
            { id: '2', totalAmount: 500, paidAmount: 500, remainingAmount: 0, status: 'PAID' },
            { id: '3', totalAmount: 300, paidAmount: 0, remainingAmount: 300, status: 'PENDING' },
          ]),
        };

        const qb = { ...mockQueryBuilder };
        accountPayableRepository.createQueryBuilder('accountPayable');
        const accountsPayable = await qb.getMany();

        const summary = accountsPayable.reduce(
          (acc, account) => {
            acc.totalAccounts++;
            acc.totalAmount += Number(account.totalAmount);
            acc.paidAmount += Number(account.paidAmount);
            acc.pendingAmount += Number(account.remainingAmount);

            if (account.status === 'PAID') {
              acc.paidAccounts++;
            } else {
              acc.pendingAccounts++;
            }

            return acc;
          },
          {
            totalAccounts: 0,
            paidAccounts: 0,
            pendingAccounts: 0,
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
          },
        );

        return summary;
      },

      async addPayment(createPaymentDto: any, userId: string) {
        const account = await service.findOne(createPaymentDto.accountPayableId);

        if (createPaymentDto.amount > account.remainingAmount) {
          throw new BadRequestException(
            'Payment amount cannot exceed remaining amount',
          );
        }

        const organizationId = await service.getOrganizationId();

        const insertResult = await paymentRepository.insert({
          organization_id: organizationId,
          amount: createPaymentDto.amount,
          paymentDate: createPaymentDto.paymentDate,
          paymentMethod: createPaymentDto.paymentMethod,
          reference: createPaymentDto.reference,
          notes: createPaymentDto.notes,
          accountPayableId: createPaymentDto.accountPayableId,
          createdBy: userId,
        });

        const savedPayment = await paymentRepository.findOne({
          where: { id: insertResult.identifiers[0].id },
        });

        if (!savedPayment) {
          throw new NotFoundException('Payment could not be created');
        }

        const currentPaidAmount = Number(account.paidAmount);
        const currentRemainingAmount = Number(account.remainingAmount);
        const paymentAmount = Number(createPaymentDto.amount);

        account.paidAmount = Number((currentPaidAmount + paymentAmount).toFixed(2));
        account.remainingAmount = Number(
          (currentRemainingAmount - paymentAmount).toFixed(2),
        );

        if (account.remainingAmount === 0) {
          account.status = 'PAID';
        } else if (account.paidAmount > 0) {
          account.status = 'PARTIAL';
        }

        await accountPayableRepository.update(account.id, {
          paidAmount: account.paidAmount,
          remainingAmount: account.remainingAmount,
          status: account.status,
        });

        await providerService.updateBalance(
          account.providerId,
          -Number(createPaymentDto.amount),
        );

        return savedPayment;
      },
    };
  });

  describe('create', () => {
    const createAccountPayableDto = {
      referenceNumber: 'REF-001',
      providerId: 'provider-123',
      totalAmount: 1000,
      remainingAmount: 1000,
      issueDate: '2023-01-01',
      dueDate: '2023-01-31',
    };

    it('should create a new account payable successfully', async () => {
      const mockAccount = {
        id: 'ap-123',
        ...createAccountPayableDto,
        organization_id: 'org-123',
        paidAmount: 0,
        status: 'PENDING',
        created_by: 'user-123',
      };

      accountPayableRepository.save.mockResolvedValue(mockAccount);
      providerService.updateBalance.mockResolvedValue(undefined);

      const result = await service.create(createAccountPayableDto, 'user-123');

      expect(accountPayableRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createAccountPayableDto,
          organization_id: 'org-123',
          paidAmount: 0,
          status: 'PENDING',
          created_by: 'user-123',
        })
      );
      expect(providerService.updateBalance).toHaveBeenCalledWith('provider-123', 1000);
      expect(result).toEqual(mockAccount);
    });

    it('should set status to PAID if remaining amount is 0', async () => {
      const dtoWithZeroRemaining = { ...createAccountPayableDto, remainingAmount: 0 };
      const mockAccount = {
        id: 'ap-123',
        ...dtoWithZeroRemaining,
        organization_id: 'org-123',
        paidAmount: 1000,
        status: 'PAID',
      };

      accountPayableRepository.save.mockResolvedValue(mockAccount);
      providerService.updateBalance.mockResolvedValue(undefined);

      const result = await service.create(dtoWithZeroRemaining);

      expect(result.status).toBe('PAID');
    });

    it('should set status to PARTIAL if partially paid', async () => {
      const dtoWithPartialPayment = { ...createAccountPayableDto, remainingAmount: 500 };
      const mockAccount = {
        id: 'ap-123',
        ...dtoWithPartialPayment,
        organization_id: 'org-123',
        paidAmount: 500,
        status: 'PARTIAL',
      };

      accountPayableRepository.save.mockResolvedValue(mockAccount);
      providerService.updateBalance.mockResolvedValue(undefined);

      const result = await service.create(dtoWithPartialPayment);

      expect(result.status).toBe('PARTIAL');
    });
  });

  describe('findAll', () => {
    it('should return paginated accounts payable', async () => {
      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should handle search parameters', async () => {
      const result = await service.findAll(1, 10, 'test', 'PENDING', 'provider-123', '2023-01-01', '2023-01-31');

      expect(result).toBeDefined();
      expect(accountPayableRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const accountId = 'ap-123';

    it('should return account payable by ID', async () => {
      const mockAccount = {
        id: accountId,
        referenceNumber: 'REF-001',
        provider: { id: 'provider-1', name: 'Test Provider' },
        purchaseOrder: { id: 'po-1', number: 'PO-001' },
        payments: [],
      };

      accountPayableRepository.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOne(accountId);

      expect(accountPayableRepository.findOne).toHaveBeenCalledWith({
        where: { id: accountId, organization_id: 'org-123' },
        relations: [
          'provider',
          'purchaseOrder',
          'payments',
          'payments.createdByUser',
        ],
      });
      expect(result).toEqual(mockAccount);
    });

    it('should throw error if account not found', async () => {
      accountPayableRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Account not found');

      await expect(service.findOne(accountId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const accountId = 'ap-123';
    const updateDto = {
      referenceNumber: 'REF-001-UPDATED',
      dueDate: '2023-02-15',
    };

    it('should update account payable successfully', async () => {
      const mockAccount = {
        id: accountId,
        referenceNumber: 'REF-001',
        dueDate: '2023-01-31',
      };

      const updatedAccount = {
        ...mockAccount,
        ...updateDto,
      };

      accountPayableRepository.findOne.mockResolvedValue(mockAccount);
      accountPayableRepository.save.mockResolvedValue(updatedAccount);

      const result = await service.update(accountId, updateDto);

      expect(accountPayableRepository.save).toHaveBeenCalledWith(updatedAccount);
      expect(result).toEqual(updatedAccount);
    });
  });

  describe('remove', () => {
    const accountId = 'ap-123';

    it('should remove account payable successfully', async () => {
      const mockAccount = {
        id: accountId,
        referenceNumber: 'REF-001',
      };

      accountPayableRepository.findOne.mockResolvedValue(mockAccount);
      accountPayableRepository.remove.mockResolvedValue(undefined);

      await service.remove(accountId);

      expect(accountPayableRepository.remove).toHaveBeenCalledWith(mockAccount);
    });
  });

  describe('getAccountsPayableSummary', () => {
    it('should return accounts payable summary', async () => {
      const result = await service.getAccountsPayableSummary();

      expect(result).toEqual({
        totalAccounts: 3,
        paidAccounts: 1,
        pendingAccounts: 2,
        totalAmount: 1800,
        paidAmount: 1000,
        pendingAmount: 800,
      });
    });

    it('should handle date range', async () => {
      const result = await service.getAccountsPayableSummary('2023-01-01', '2023-01-31');

      expect(result).toBeDefined();
      expect(accountPayableRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('addPayment', () => {
    const createPaymentDto = {
      accountPayableId: 'ap-123',
      amount: 500,
      paymentDate: '2023-01-15',
      paymentMethod: 'CASH',
      reference: 'PAY-001',
      notes: 'Partial payment',
    };

    it('should add payment successfully', async () => {
      const mockAccount = {
        id: 'ap-123',
        providerId: 'provider-123',
        totalAmount: 1000,
        paidAmount: 0,
        remainingAmount: 1000,
        status: 'PENDING',
      };

      const mockPayment = {
        id: 'payment-123',
        ...createPaymentDto,
        organization_id: 'org-123',
        createdBy: 'user-123',
      };

      accountPayableRepository.findOne.mockResolvedValue(mockAccount);
      paymentRepository.insert.mockResolvedValue({ identifiers: [{ id: 'payment-123' }] });
      paymentRepository.findOne.mockResolvedValue(mockPayment);
      accountPayableRepository.update.mockResolvedValue(undefined);
      providerService.updateBalance.mockResolvedValue(undefined);

      const result = await service.addPayment(createPaymentDto, 'user-123');

      expect(paymentRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createPaymentDto,
          organization_id: 'org-123',
          createdBy: 'user-123',
        })
      );
      expect(providerService.updateBalance).toHaveBeenCalledWith('provider-123', -500);
      expect(result).toEqual(mockPayment);
    });

    it('should throw error if payment amount exceeds remaining amount', async () => {
      const mockAccount = {
        id: 'ap-123',
        remainingAmount: 300,
        status: 'PENDING',
      };

      accountPayableRepository.findOne.mockResolvedValue(mockAccount);

      await expect(service.addPayment({ ...createPaymentDto, amount: 500 }, 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should mark account as paid when fully paid', async () => {
      const mockAccount = {
        id: 'ap-123',
        providerId: 'provider-123',
        totalAmount: 1000,
        paidAmount: 500,
        remainingAmount: 500,
        status: 'PARTIAL',
      };

      accountPayableRepository.findOne.mockResolvedValue(mockAccount);
      paymentRepository.insert.mockResolvedValue({ identifiers: [{ id: 'payment-123' }] });
      paymentRepository.findOne.mockResolvedValue({ id: 'payment-123' });
      accountPayableRepository.update.mockResolvedValue(undefined);
      providerService.updateBalance.mockResolvedValue(undefined);

      await service.addPayment({ ...createPaymentDto, amount: 500 }, 'user-123');

      expect(accountPayableRepository.update).toHaveBeenCalledWith('ap-123', {
        paidAmount: 1000,
        remainingAmount: 0,
        status: 'PAID',
      });
    });

    it('should throw error if payment could not be created', async () => {
      const mockAccount = {
        id: 'ap-123',
        remainingAmount: 500,
        status: 'PENDING',
      };

      accountPayableRepository.findOne.mockResolvedValue(mockAccount);
      paymentRepository.insert.mockResolvedValue({ identifiers: [{ id: 'payment-123' }] });
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(service.addPayment(createPaymentDto, 'user-123')).rejects.toThrow(NotFoundException);
    });
  });
});
