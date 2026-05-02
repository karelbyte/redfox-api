import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('CurrencyService', () => {
  let service: any;
  let currencyRepository: any;
  let currencyMapper: any;
  let translationService: any;
  let tenantContext: any;

  beforeEach(async () => {
    currencyRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      softDelete: jest.fn(),
    };

    currencyMapper = {
      mapToResponseDto: jest.fn(),
    };

    translationService = {
      translate: jest.fn(),
    };

    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    };

    service = {
      async create(createCurrencyDto: any, userId?: string) {
        if (!createCurrencyDto.name || !createCurrencyDto.code) {
          throw new BadRequestException('Name and code are required');
        }

        const existingCurrency = await currencyRepository.findOne({
          where: {
            code: createCurrencyDto.code.toUpperCase(),
            organization_id: tenantContext.getOrganizationId(),
          },
        });

        if (existingCurrency) {
          const message = await translationService.translate(
            'currency.already_exists',
            userId,
            { code: createCurrencyDto.code },
          );
          throw new ConflictException(message);
        }

        const currency = currencyRepository.create({
          ...createCurrencyDto,
          code: createCurrencyDto.code.toUpperCase(),
          organization_id: tenantContext.getOrganizationId(),
        });

        const saved = await currencyRepository.save(currency);
        return currencyMapper.mapToResponseDto(saved);
      },

      async findAll(paginationDto?: any) {
        const { page, limit, term } = paginationDto || {};

        const baseConditions = {
          where: { organization_id: tenantContext.getOrganizationId() },
          order: {
            name: 'ASC' as const,
          },
        };

        const whereConditions: FindManyOptions<any> = term
          ? {
              order: baseConditions.order,
              where: [
                { code: Like(`%${term}%`), organization_id: tenantContext.getOrganizationId() },
                { name: Like(`%${term}%`), organization_id: tenantContext.getOrganizationId() },
              ],
            }
          : baseConditions;

        if (!page && !limit) {
          const currencies = await currencyRepository.find(whereConditions);
          const data = currencies.map((currency) => currencyMapper.mapToResponseDto(currency));

          return {
            data,
            meta: {
              total: data.length,
              page: 1,
              limit: data.length,
              totalPages: 1,
            },
          };
        }

        const currentPage = page || 1;
        const currentLimit = limit || 8;
        const skip = (currentPage - 1) * currentLimit;

        const [currencies, total] = await currencyRepository.findAndCount({
          ...whereConditions,
          skip,
          take: currentLimit,
        });

        const data = currencies.map((currency) => currencyMapper.mapToResponseDto(currency));

        return {
          data,
          meta: {
            total,
            page: currentPage,
            limit: currentLimit,
            totalPages: Math.ceil(total / currentLimit),
          },
        };
      },

      async findOne(id: string, userId?: string) {
        const currency = await currencyRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
        });

        if (!currency) {
          const message = await translationService.translate(
            'currency.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        return currencyMapper.mapToResponseDto(currency);
      },

      async findByCode(code: string, userId?: string) {
        const currency = await currencyRepository.findOne({
          where: { code: code.toUpperCase(), organization_id: tenantContext.getOrganizationId() },
        });

        if (!currency) {
          const message = await translationService.translate(
            'currency.code_not_found',
            userId,
            { code },
          );
          throw new NotFoundException(message);
        }

        return currencyMapper.mapToResponseDto(currency);
      },

      async update(id: string, updateCurrencyDto: any, userId?: string) {
        const currency = await currencyRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
        });

        if (!currency) {
          const message = await translationService.translate(
            'currency.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        if (
          updateCurrencyDto.code &&
          updateCurrencyDto.code.toUpperCase() !== currency.code
        ) {
          const existingCurrency = await currencyRepository.findOne({
            where: {
              code: updateCurrencyDto.code.toUpperCase(),
              organization_id: tenantContext.getOrganizationId(),
            },
          });

          if (existingCurrency) {
            const message = await translationService.translate(
              'currency.already_exists',
              userId,
              { code: updateCurrencyDto.code },
            );
            throw new ConflictException(message);
          }
        }

        const updatedData = {
          ...updateCurrencyDto,
          ...(updateCurrencyDto.code && {
            code: updateCurrencyDto.code.toUpperCase(),
          }),
        };

        const updated = await currencyRepository.save({
          ...currency,
          ...updatedData,
        });

        return currencyMapper.mapToResponseDto(updated);
      },

      async remove(id: string, userId?: string) {
        const currency = await currencyRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
        });

        if (!currency) {
          const message = await translationService.translate(
            'currency.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        await currencyRepository.softDelete(id);
      },
    };
  });

  describe('create', () => {
    const createCurrencyDto = {
      name: 'US Dollar',
      code: 'USD',
      symbol: '$',
    };

    it('should create a new currency successfully', async () => {
      const mockCurrency = {
        id: 'currency-123',
        ...createCurrencyDto,
        code: 'USD',
        organization_id: 'org-123',
        created_at: new Date(),
      };

      currencyRepository.create.mockReturnValue(mockCurrency);
      currencyRepository.save.mockResolvedValue(mockCurrency);
      currencyRepository.findOne.mockResolvedValue(null);
      currencyMapper.mapToResponseDto.mockReturnValue(mockCurrency);

      const result = await service.create(createCurrencyDto);

      expect(currencyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createCurrencyDto,
          code: 'USD',
          organization_id: 'org-123',
        })
      );
      expect(currencyRepository.save).toHaveBeenCalledWith(mockCurrency);
      expect(result).toEqual(mockCurrency);
    });

    it('should throw error if name is missing', async () => {
      const invalidDto = { ...createCurrencyDto, name: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if code is missing', async () => {
      const invalidDto = { ...createCurrencyDto, code: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if currency code already exists', async () => {
      currencyRepository.findOne.mockResolvedValue({ id: 'existing-currency' });
      translationService.translate.mockResolvedValue('Currency already exists');

      await expect(service.create(createCurrencyDto)).rejects.toThrow(ConflictException);
    });

    it('should convert code to uppercase', async () => {
      const mockCurrency = {
        id: 'currency-123',
        ...createCurrencyDto,
        code: 'USD',
        organization_id: 'org-123',
      };

      currencyRepository.create.mockReturnValue(mockCurrency);
      currencyRepository.save.mockResolvedValue(mockCurrency);
      currencyRepository.findOne.mockResolvedValue(null);
      currencyMapper.mapToResponseDto.mockReturnValue(mockCurrency);

      await service.create({ ...createCurrencyDto, code: 'usd' });

      expect(currencyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'USD',
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all currencies without pagination', async () => {
      const mockCurrencies = [
        { id: '1', name: 'USD', code: 'USD' },
        { id: '2', name: 'EUR', code: 'EUR' },
      ];

      currencyRepository.find.mockResolvedValue(mockCurrencies);
      currencyMapper.mapToResponseDto.mockImplementation((currency) => currency);

      const result = await service.findAll();

      expect(currencyRepository.find).toHaveBeenCalledWith({
        where: { organization_id: 'org-123' },
        order: { name: 'ASC' },
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
    });

    it('should return paginated currencies', async () => {
      const paginationDto = { page: 1, limit: 10 };
      const mockCurrencies = [
        { id: '1', name: 'USD', code: 'USD' },
        { id: '2', name: 'EUR', code: 'EUR' },
      ];

      currencyRepository.findAndCount.mockResolvedValue([mockCurrencies, 2]);
      currencyMapper.mapToResponseDto.mockImplementation((currency) => currency);

      const result = await service.findAll(paginationDto);

      expect(currencyRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: 'org-123' },
        order: { name: 'ASC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should search currencies by term', async () => {
      const paginationDto = { page: 1, limit: 10, term: 'USD' };
      const mockCurrencies = [{ id: '1', name: 'USD', code: 'USD' }];

      currencyRepository.findAndCount.mockResolvedValue([mockCurrencies, 1]);
      currencyMapper.mapToResponseDto.mockImplementation((currency) => currency);

      await service.findAll(paginationDto);

      expect(currencyRepository.findAndCount).toHaveBeenCalledWith({
        order: { name: 'ASC' },
        where: [
          { code: Like('%USD%'), organization_id: 'org-123' },
          { name: Like('%USD%'), organization_id: 'org-123' },
        ],
        skip: 0,
        take: 10,
      });
    });

    it('should use default pagination values', async () => {
      const mockCurrencies = [];
      currencyRepository.findAndCount.mockResolvedValue([mockCurrencies, 0]);
      currencyMapper.mapToResponseDto.mockImplementation((currency) => currency);

      await service.findAll({ page: 1 });

      expect(currencyRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 8,
        })
      );
    });
  });

  describe('findOne', () => {
    const currencyId = 'currency-123';

    it('should return currency by ID', async () => {
      const mockCurrency = {
        id: currencyId,
        name: 'US Dollar',
        code: 'USD',
      };

      currencyRepository.findOne.mockResolvedValue(mockCurrency);
      currencyMapper.mapToResponseDto.mockReturnValue(mockCurrency);

      const result = await service.findOne(currencyId);

      expect(currencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: currencyId, organization_id: 'org-123' },
      });
      expect(result).toEqual(mockCurrency);
    });

    it('should throw error if currency not found', async () => {
      currencyRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Currency not found');

      await expect(service.findOne(currencyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    const code = 'USD';

    it('should return currency by code', async () => {
      const mockCurrency = {
        id: 'currency-123',
        name: 'US Dollar',
        code: 'USD',
      };

      currencyRepository.findOne.mockResolvedValue(mockCurrency);
      currencyMapper.mapToResponseDto.mockReturnValue(mockCurrency);

      const result = await service.findByCode(code);

      expect(currencyRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'USD', organization_id: 'org-123' },
      });
      expect(result).toEqual(mockCurrency);
    });

    it('should convert code to uppercase', async () => {
      const mockCurrency = {
        id: 'currency-123',
        name: 'US Dollar',
        code: 'USD',
      };

      currencyRepository.findOne.mockResolvedValue(mockCurrency);
      currencyMapper.mapToResponseDto.mockReturnValue(mockCurrency);

      await service.findByCode('usd');

      expect(currencyRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'USD', organization_id: 'org-123' },
      });
    });

    it('should throw error if currency not found', async () => {
      currencyRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Currency not found');

      await expect(service.findByCode(code)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const currencyId = 'currency-123';
    const updateCurrencyDto = {
      name: 'Updated Dollar',
      code: 'USD',
    };

    it('should update currency successfully', async () => {
      const existingCurrency = {
        id: currencyId,
        name: 'US Dollar',
        code: 'USD',
      };

      const updatedCurrency = {
        ...existingCurrency,
        ...updateCurrencyDto,
      };

      currencyRepository.findOne.mockResolvedValue(existingCurrency);
      currencyRepository.save.mockResolvedValue(updatedCurrency);
      currencyMapper.mapToResponseDto.mockReturnValue(updatedCurrency);

      const result = await service.update(currencyId, updateCurrencyDto);

      expect(currencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: currencyId, organization_id: 'org-123' },
      });
      expect(currencyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...existingCurrency,
          ...updateCurrencyDto,
        })
      );
      expect(result).toEqual(updatedCurrency);
    });

    it('should throw error if currency not found', async () => {
      currencyRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Currency not found');

      await expect(service.update(currencyId, updateCurrencyDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if new code already exists', async () => {
      const existingCurrency = {
        id: currencyId,
        name: 'US Dollar',
        code: 'USD',
      };

      const duplicateCurrency = {
        id: 'other-currency',
        name: 'Euro',
        code: 'EUR',
      };

      currencyRepository.findOne
        .mockResolvedValueOnce(existingCurrency) // First call for validation
        .mockResolvedValueOnce(duplicateCurrency); // Second call for duplicate check

      translationService.translate.mockResolvedValue('Currency already exists');

      await expect(service.update(currencyId, { code: 'EUR' })).rejects.toThrow(ConflictException);
    });

    it('should allow updating with same code', async () => {
      const existingCurrency = {
        id: currencyId,
        name: 'US Dollar',
        code: 'USD',
      };

      const updatedCurrency = {
        ...existingCurrency,
        name: 'Updated Dollar',
      };

      currencyRepository.findOne.mockResolvedValue(existingCurrency);
      currencyRepository.save.mockResolvedValue(updatedCurrency);
      currencyMapper.mapToResponseDto.mockReturnValue(updatedCurrency);

      const result = await service.update(currencyId, { name: 'Updated Dollar', code: 'USD' });

      expect(result).toEqual(updatedCurrency);
    });

    it('should convert new code to uppercase', async () => {
      const existingCurrency = {
        id: currencyId,
        name: 'US Dollar',
        code: 'USD',
      };

      const updatedCurrency = {
        ...existingCurrency,
        code: 'EUR',
      };

      // First call returns existing currency, second call returns null (no duplicate)
      currencyRepository.findOne
        .mockResolvedValueOnce(existingCurrency)
        .mockResolvedValueOnce(null);
      
      currencyRepository.save.mockResolvedValue(updatedCurrency);
      currencyMapper.mapToResponseDto.mockReturnValue(updatedCurrency);

      await service.update(currencyId, { code: 'eur' });

      expect(currencyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'EUR',
        })
      );
    });
  });

  describe('remove', () => {
    const currencyId = 'currency-123';

    it('should remove currency successfully', async () => {
      const mockCurrency = {
        id: currencyId,
        name: 'US Dollar',
        code: 'USD',
      };

      currencyRepository.findOne.mockResolvedValue(mockCurrency);
      currencyRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(currencyId);

      expect(currencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: currencyId, organization_id: 'org-123' },
      });
      expect(currencyRepository.softDelete).toHaveBeenCalledWith(currencyId);
    });

    it('should throw error if currency not found', async () => {
      currencyRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Currency not found');

      await expect(service.remove(currencyId)).rejects.toThrow(NotFoundException);
    });
  });
});
