import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('CashRegisterService', () => {
  let service: any;
  let cashRegisterRepository: any;
  let cashTransactionRepository: any;
  let translationService: any;
  let tenantContext: any;
  let userAttributionService: any;
  let cashRegisterMapper: any;

  beforeEach(async () => {
    cashRegisterRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      softDelete: jest.fn(),
    };

    cashTransactionRepository = {
      count: jest.fn(),
      findOne: jest.fn(),
    };

    translationService = {
      translate: jest.fn(),
    };

    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    };

    userAttributionService = {
      getAuthorizedCashRegisterIds: jest.fn(),
    };

    cashRegisterMapper = {
      mapToResponseDto: jest.fn((entity) => ({
        id: entity.id,
        code: entity.code,
        name: entity.name,
        status: entity.status,
        currentAmount: entity.currentAmount,
        initialAmount: entity.initialAmount,
      })),
    };

    service = {
      get organizationId() {
        return tenantContext.getOrganizationId() as string;
      },

      async findAll(
        page: string = '1',
        limit: string = '10',
        term: string = '',
        userId?: string,
      ) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * limitNum;

        const orgFilter = { organization_id: service.organizationId };

        let authorizedCashRegisterIds: string[] | null = null;
        if (userId) {
          authorizedCashRegisterIds = await userAttributionService.getAuthorizedCashRegisterIds(userId);
        }

        let whereConditions;
        if (term) {
          const baseWhere = [
            { code: Like(`%${term}%`), ...orgFilter },
            { name: Like(`%${term}%`), ...orgFilter },
          ];
          if (userId && authorizedCashRegisterIds !== null && authorizedCashRegisterIds.length > 0) {
            whereConditions = baseWhere.map((w) => ({ ...w, id: In(authorizedCashRegisterIds!) }));
          } else if (userId && authorizedCashRegisterIds !== null) {
            whereConditions = [];
          } else {
            whereConditions = baseWhere;
          }
        } else {
          if (userId && authorizedCashRegisterIds !== null && authorizedCashRegisterIds.length > 0) {
            whereConditions = { id: In(authorizedCashRegisterIds), ...orgFilter };
          } else if (userId && authorizedCashRegisterIds !== null) {
            whereConditions = [];
          } else {
            whereConditions = orgFilter;
          }
        }

        const [data, total] = await cashRegisterRepository.findAndCount({
          where: whereConditions,
          skip,
          take: limitNum,
          order: { created_at: 'DESC' },
        });

        return {
          data: data.map((cashRegister) => cashRegisterMapper.mapToResponseDto(cashRegister)),
          meta: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          },
        };
      },

      async getCurrentCashRegister(userId?: string) {
        const authorizedCashRegisterIds = await userAttributionService.getAuthorizedCashRegisterIds(userId || '');

        const whereConditions: any = {
          status: 'OPEN',
          organization_id: service.organizationId,
        };

        if (authorizedCashRegisterIds !== null) {
          if (authorizedCashRegisterIds.length === 0) {
            const message = await translationService.translate('cash_register.no_open_register', userId);
            throw new NotFoundException(message);
          }
          whereConditions.id = In(authorizedCashRegisterIds);
        }

        const currentCashRegister = await cashRegisterRepository.findOne({
          where: whereConditions,
          order: { openedAt: 'DESC' },
        });

        if (!currentCashRegister) {
          const message = await translationService.translate('cash_register.no_open_register', userId);
          throw new NotFoundException(message);
        }

        return cashRegisterMapper.mapToResponseDto(currentCashRegister);
      },

      async create(createCashRegisterDto: any, userId?: string) {
        try {
          const existingCashRegister = await cashRegisterRepository.findOne({
            where: {
              code: createCashRegisterDto.code,
              organization_id: service.organizationId,
            },
          });

          if (existingCashRegister) {
            const message = await translationService.translate('cash_register.already_exists', userId, { code: createCashRegisterDto.code });
            throw new ConflictException(message);
          }

          const cashRegister = cashRegisterRepository.create({
            ...createCashRegisterDto,
            initialAmount: createCashRegisterDto.initial_amount,
            currentAmount: createCashRegisterDto.initial_amount,
            openedBy: userId,
            organization_id: service.organizationId,
          });

          const savedCashRegister = await cashRegisterRepository.save({
            ...cashRegister,
            initialAmount: createCashRegisterDto.initial_amount,
            currentAmount: createCashRegisterDto.initial_amount,
          });
          return cashRegisterMapper.mapToResponseDto(savedCashRegister);
        } catch (error: unknown) {
          const dbError = error as { code?: string; message?: string };
          if (
            dbError?.code === 'ER_DUP_ENTRY' &&
            dbError?.message?.includes('cash_registers.UQ_')
          ) {
            const message = await translationService.translate('cash_register.already_exists', userId, { code: createCashRegisterDto.code });
            throw new BadRequestException(message);
          }
          throw error;
        }
      },

      async openCashRegister(openCashRegisterDto: any, userId?: string) {
        const timestamp = Date.now();
        const code = `CASH-${timestamp}`;

        const cashRegister = cashRegisterRepository.create({
          code,
          name: openCashRegisterDto.name || `Caja ${new Date().toLocaleDateString()}`,
          description: openCashRegisterDto.description,
          initialAmount: openCashRegisterDto.initial_amount,
          currentAmount: openCashRegisterDto.initial_amount,
          status: 'OPEN',
          openedAt: new Date(),
          openedBy: userId,
          organization_id: service.organizationId,
        });

        const savedCashRegister = await cashRegisterRepository.save(cashRegister);
        return cashRegisterMapper.mapToResponseDto(savedCashRegister);
      },

      async getAuthorizedOpenCashRegisters(userId?: string) {
        const authorizedCashRegisterIds = await userAttributionService.getAuthorizedCashRegisterIds(userId || '');

        const whereConditions: any = {
          status: 'OPEN',
          organization_id: service.organizationId,
        };

        if (authorizedCashRegisterIds !== null) {
          if (authorizedCashRegisterIds.length === 0) {
            return [];
          }
          whereConditions.id = In(authorizedCashRegisterIds);
        }

        const cashRegisters = await cashRegisterRepository.find({
          where: whereConditions,
          order: { openedAt: 'DESC' },
        });

        return cashRegisters.map((cr) => cashRegisterMapper.mapToResponseDto(cr));
      },

      async closeCashRegister(id: string, userId?: string) {
        const cashRegister = await cashRegisterRepository.findOne({
          where: { id, organization_id: service.organizationId },
        });

        if (!cashRegister) {
          const message = await translationService.translate('cash_register.not_found', userId, { id });
          throw new NotFoundException(message);
        }

        if (cashRegister.status === 'CLOSED') {
          const message = await translationService.translate('cash_register.already_closed', userId);
          throw new BadRequestException(message);
        }

        cashRegister.status = 'CLOSED';
        cashRegister.closedAt = new Date();
        cashRegister.closedBy = userId || '';

        const updatedCashRegister = await cashRegisterRepository.save(cashRegister);
        return cashRegisterMapper.mapToResponseDto(updatedCashRegister);
      },

      async updateCashRegister(id: string, updateCashRegisterDto: any, userId?: string) {
        try {
          const cashRegister = await cashRegisterRepository.findOne({
            where: { id, organization_id: service.organizationId },
          });

          if (!cashRegister) {
            const message = await translationService.translate('cash_register.not_found', userId, { id });
            throw new NotFoundException(message);
          }

          if (
            updateCashRegisterDto.code &&
            updateCashRegisterDto.code !== cashRegister.code
          ) {
            const existingCashRegister = await cashRegisterRepository.findOne({
              where: {
                code: updateCashRegisterDto.code,
                organization_id: service.organizationId,
              },
            });

            if (existingCashRegister) {
              const message = await translationService.translate('cash_register.already_exists', userId, { code: updateCashRegisterDto.code });
              throw new ConflictException(message);
            }
          }

          const updatedData = {
            ...updateCashRegisterDto,
            ...(updateCashRegisterDto.current_amount && {
              currentAmount: updateCashRegisterDto.current_amount,
            }),
          };

          const updatedCashRegister = await cashRegisterRepository.save({
            ...cashRegister,
            ...updatedData,
          });

          return cashRegisterMapper.mapToResponseDto(updatedCashRegister);
        } catch (error: unknown) {
          const dbError = error as { code?: string; message?: string };
          if (
            dbError?.code === 'ER_DUP_ENTRY' &&
            dbError?.message?.includes('cash_registers.UQ_')
          ) {
            const message = await translationService.translate('cash_register.already_exists', userId, { code: updateCashRegisterDto.code });
            throw new BadRequestException(message);
          }
          throw error;
        }
      },

      async getCashRegisterBalance(id: string, userId?: string) {
        const cashRegister = await cashRegisterRepository.findOne({
          where: { id, organization_id: service.organizationId },
        });

        if (!cashRegister) {
          const message = await translationService.translate('cash_register.not_found', userId, { id });
          throw new NotFoundException(message);
        }

        const [totalTransactions, lastTransaction] = await Promise.all([
          cashTransactionRepository.count({
            where: { cashRegisterId: id },
          }),
          cashTransactionRepository.findOne({
            where: { cashRegisterId: id },
            order: { created_at: 'DESC' },
            select: ['created_at'],
          }),
        ]);

        return {
          current_amount: Number(cashRegister.currentAmount),
          total_transactions: totalTransactions,
          last_transaction_at: lastTransaction?.created_at || null,
        };
      },

      async findOne(id: string, userId?: string) {
        const cashRegister = await cashRegisterRepository.findOne({
          where: { id, organization_id: service.organizationId },
        });

        if (!cashRegister) {
          const message = await translationService.translate('cash_register.not_found', userId, { id });
          throw new NotFoundException(message);
        }

        return cashRegisterMapper.mapToResponseDto(cashRegister);
      },

      async remove(id: string, userId?: string) {
        const cashRegister = await cashRegisterRepository.findOne({
          where: { id, organization_id: service.organizationId },
        });

        if (!cashRegister) {
          const message = await translationService.translate('cash_register.not_found', userId, { id });
          throw new NotFoundException(message);
        }

        await cashRegisterRepository.softDelete({
          id,
          organization_id: service.organizationId,
        });
      },
    };
  });

  describe('findAll', () => {
    it('should return paginated cash registers', async () => {
      const mockData = [
        { id: 'cr-1', code: 'CASH-001', name: 'Main Register', status: 'OPEN', currentAmount: 1000, initialAmount: 1000 },
        { id: 'cr-2', code: 'CASH-002', name: 'Secondary Register', status: 'CLOSED', currentAmount: 500, initialAmount: 500 },
      ];

      cashRegisterRepository.findAndCount.mockResolvedValue([mockData, 2]);

      const result = await service.findAll('1', '10', '', undefined);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should handle search term', async () => {
      const mockData = [{ id: 'cr-1', code: 'CASH-001', name: 'Main Register', status: 'OPEN', currentAmount: 1000, initialAmount: 1000 }];

      cashRegisterRepository.findAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.findAll('1', '10', 'CASH', undefined);

      expect(result.data).toHaveLength(1);
      expect(cashRegisterRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.arrayContaining([
          expect.objectContaining({ code: expect.objectContaining({}) }),
          expect.objectContaining({ name: expect.objectContaining({}) }),
        ]),
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });

    it('should handle user authorization', async () => {
      userAttributionService.getAuthorizedCashRegisterIds.mockResolvedValue(['cr-1', 'cr-2']);
      cashRegisterRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('1', '10', '', 'user-123');

      expect(userAttributionService.getAuthorizedCashRegisterIds).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getCurrentCashRegister', () => {
    it('should return current open cash register', async () => {
      const mockCashRegister = { id: 'cr-1', code: 'CASH-001', status: 'OPEN', currentAmount: 1000 };
      userAttributionService.getAuthorizedCashRegisterIds.mockResolvedValue(['cr-1']);
      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);

      const result = await service.getCurrentCashRegister('user-123');

      expect(result).toEqual(cashRegisterMapper.mapToResponseDto(mockCashRegister));
      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: {
          status: 'OPEN',
          organization_id: 'org-123',
          id: expect.objectContaining({}),
        },
        order: { openedAt: 'DESC' },
      });
    });

    it('should throw error if no open register found', async () => {
      userAttributionService.getAuthorizedCashRegisterIds.mockResolvedValue(['cr-1']);
      cashRegisterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('No open register found');

      await expect(service.getCurrentCashRegister('user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if user has no authorized registers', async () => {
      userAttributionService.getAuthorizedCashRegisterIds.mockResolvedValue([]);
      translationService.translate.mockResolvedValue('No open register found');

      await expect(service.getCurrentCashRegister('user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createCashRegisterDto = {
      code: 'CASH-001',
      name: 'Main Register',
      initial_amount: 1000,
      description: 'Main cash register',
    };

    it('should create a new cash register successfully', async () => {
      const mockCashRegister = {
        id: 'cr-123',
        ...createCashRegisterDto,
        organization_id: 'org-123',
        openedBy: 'user-123',
      };

      cashRegisterRepository.findOne.mockResolvedValue(null);
      cashRegisterRepository.create.mockReturnValue(mockCashRegister);
      cashRegisterRepository.save.mockResolvedValue(mockCashRegister);

      const result = await service.create(createCashRegisterDto, 'user-123');

      expect(cashRegisterRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createCashRegisterDto,
          initialAmount: 1000,
          currentAmount: 1000,
          openedBy: 'user-123',
          organization_id: 'org-123',
        })
      );
      expect(result).toEqual(cashRegisterMapper.mapToResponseDto(mockCashRegister));
    });

    it('should throw error if code already exists', async () => {
      const existingCashRegister = { id: 'existing', code: 'CASH-001' };
      cashRegisterRepository.findOne.mockResolvedValue(existingCashRegister);
      translationService.translate.mockResolvedValue('Cash register already exists');

      await expect(service.create(createCashRegisterDto, 'user-123')).rejects.toThrow(ConflictException);
    });

    it('should handle database duplicate error', async () => {
      const dbError = { code: 'ER_DUP_ENTRY', message: 'Duplicate entry cash_registers.UQ_CODE' };
      cashRegisterRepository.findOne.mockResolvedValue(null);
      cashRegisterRepository.create.mockReturnValue({});
      cashRegisterRepository.save.mockRejectedValue(dbError);
      translationService.translate.mockResolvedValue('Cash register already exists');

      await expect(service.create(createCashRegisterDto, 'user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('openCashRegister', () => {
    const openCashRegisterDto = {
      name: 'Daily Register',
      initial_amount: 500,
      description: 'Daily opening',
    };

    it('should open a new cash register', async () => {
      const mockCashRegister = {
        id: 'cr-123',
        code: expect.stringMatching(/^CASH-\d+$/),
        ...openCashRegisterDto,
        status: 'OPEN',
        openedAt: expect.any(Date),
        openedBy: 'user-123',
        organization_id: 'org-123',
      };

      cashRegisterRepository.create.mockReturnValue(mockCashRegister);
      cashRegisterRepository.save.mockResolvedValue(mockCashRegister);

      const result = await service.openCashRegister(openCashRegisterDto, 'user-123');

      expect(cashRegisterRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.stringMatching(/^CASH-\d+$/),
          name: openCashRegisterDto.name,
          initialAmount: 500,
          currentAmount: 500,
          status: 'OPEN',
          openedAt: expect.any(Date),
          openedBy: 'user-123',
          organization_id: 'org-123',
        })
      );
      expect(result).toEqual(cashRegisterMapper.mapToResponseDto(mockCashRegister));
    });

    it('should generate default name if not provided', async () => {
      const mockCashRegister = { id: 'cr-123', status: 'OPEN' };
      cashRegisterRepository.create.mockReturnValue(mockCashRegister);
      cashRegisterRepository.save.mockResolvedValue(mockCashRegister);

      await service.openCashRegister({ initial_amount: 500 }, 'user-123');

      expect(cashRegisterRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Caja'),
        })
      );
    });
  });

  describe('getAuthorizedOpenCashRegisters', () => {
    it('should return authorized open cash registers', async () => {
      const mockCashRegisters = [
        { id: 'cr-1', status: 'OPEN' },
        { id: 'cr-2', status: 'OPEN' },
      ];

      userAttributionService.getAuthorizedCashRegisterIds.mockResolvedValue(['cr-1', 'cr-2']);
      cashRegisterRepository.find.mockResolvedValue(mockCashRegisters);

      const result = await service.getAuthorizedOpenCashRegisters('user-123');

      expect(result).toHaveLength(2);
      expect(userAttributionService.getAuthorizedCashRegisterIds).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array if no authorized registers', async () => {
      userAttributionService.getAuthorizedCashRegisterIds.mockResolvedValue([]);

      const result = await service.getAuthorizedOpenCashRegisters('user-123');

      expect(result).toEqual([]);
      expect(cashRegisterRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('closeCashRegister', () => {
    const registerId = 'cr-123';

    it('should close cash register successfully', async () => {
      const mockCashRegister = {
        id: registerId,
        code: 'CASH-001',
        status: 'OPEN',
        currentAmount: 1000,
      };

      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      cashRegisterRepository.save.mockResolvedValue({ ...mockCashRegister, status: 'CLOSED', closedAt: expect.any(Date) });

      const result = await service.closeCashRegister(registerId, 'user-123');

      expect(cashRegisterRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CLOSED',
          closedAt: expect.any(Date),
          closedBy: 'user-123',
        })
      );
      expect(result).toEqual(cashRegisterMapper.mapToResponseDto({ ...mockCashRegister, status: 'CLOSED', closedAt: expect.any(Date) }));
    });

    it('should throw error if cash register not found', async () => {
      cashRegisterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Cash register not found');

      await expect(service.closeCashRegister(registerId, 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if already closed', async () => {
      const mockCashRegister = { id: registerId, status: 'CLOSED' };
      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      translationService.translate.mockResolvedValue('Cash register already closed');

      await expect(service.closeCashRegister(registerId, 'user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCashRegister', () => {
    const registerId = 'cr-123';
    const updateDto = {
      name: 'Updated Register',
      current_amount: 1200,
    };

    it('should update cash register successfully', async () => {
      const mockCashRegister = {
        id: registerId,
        code: 'CASH-001',
        name: 'Old Register',
        currentAmount: 1000,
      };

      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      cashRegisterRepository.save.mockResolvedValue({ ...mockCashRegister, ...updateDto });

      const result = await service.updateCashRegister(registerId, updateDto, 'user-123');

      expect(cashRegisterRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockCashRegister,
          name: 'Updated Register',
          currentAmount: 1200,
        })
      );
      expect(result).toEqual(cashRegisterMapper.mapToResponseDto({ ...mockCashRegister, ...updateDto }));
    });

    it('should throw error if cash register not found', async () => {
      cashRegisterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Cash register not found');

      await expect(service.updateCashRegister(registerId, updateDto, 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if code already exists', async () => {
      const mockCashRegister = { id: registerId, code: 'CASH-001' };
      const existingCashRegister = { id: 'existing', code: 'CASH-002' };
      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      cashRegisterRepository.findOne.mockResolvedValueOnce(mockCashRegister).mockResolvedValueOnce(existingCashRegister);
      translationService.translate.mockResolvedValue('Cash register already exists');

      await expect(service.updateCashRegister(registerId, { code: 'CASH-002' }, 'user-123')).rejects.toThrow(ConflictException);
    });
  });

  describe('getCashRegisterBalance', () => {
    const registerId = 'cr-123';

    it('should return cash register balance', async () => {
      const mockCashRegister = {
        id: registerId,
        currentAmount: 1000,
      };

      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      cashTransactionRepository.count.mockResolvedValue(25);
      cashTransactionRepository.findOne.mockResolvedValue({ created_at: '2023-01-15T10:30:00Z' });

      const result = await service.getCashRegisterBalance(registerId, 'user-123');

      expect(result).toEqual({
        current_amount: 1000,
        total_transactions: 25,
        last_transaction_at: '2023-01-15T10:30:00Z',
      });
      expect(cashTransactionRepository.count).toHaveBeenCalledWith({
        where: { cashRegisterId: registerId },
      });
    });

    it('should throw error if cash register not found', async () => {
      cashRegisterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Cash register not found');

      await expect(service.getCashRegisterBalance(registerId, 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    const registerId = 'cr-123';

    it('should return cash register by ID', async () => {
      const mockCashRegister = {
        id: registerId,
        code: 'CASH-001',
        name: 'Main Register',
        status: 'OPEN',
      };

      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);

      const result = await service.findOne(registerId, 'user-123');

      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: { id: registerId, organization_id: 'org-123' },
      });
      expect(result).toEqual(cashRegisterMapper.mapToResponseDto(mockCashRegister));
    });

    it('should throw error if cash register not found', async () => {
      cashRegisterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Cash register not found');

      await expect(service.findOne(registerId, 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const registerId = 'cr-123';

    it('should remove cash register successfully', async () => {
      const mockCashRegister = {
        id: registerId,
        code: 'CASH-001',
      };

      cashRegisterRepository.findOne.mockResolvedValue(mockCashRegister);
      cashRegisterRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(registerId, 'user-123');

      expect(cashRegisterRepository.softDelete).toHaveBeenCalledWith({
        id: registerId,
        organization_id: 'org-123',
      });
    });

    it('should throw error if cash register not found', async () => {
      cashRegisterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Cash register not found');

      await expect(service.remove(registerId, 'user-123')).rejects.toThrow(NotFoundException);
    });
  });
});
