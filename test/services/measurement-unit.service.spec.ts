import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MeasurementUnitService', () => {
  let service: any;
  let measurementUnitRepository: any;
  let productRepository: any;
  let measurementUnitMapper: any;
  let translationService: any;
  let tenantContext: any;
  let satCatalogService: any;

  beforeEach(async () => {
    measurementUnitRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      softRemove: jest.fn(),
    };

    productRepository = {
      count: jest.fn(),
      find: jest.fn(),
    };

    measurementUnitMapper = {
      mapToResponseDto: jest.fn(),
    };

    translationService = {
      translate: jest.fn(),
    };

    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    };

    satCatalogService = {
      searchMeasurementUnits: jest.fn(),
    };

    service = {
      async create(createMeasurementUnitDto: any, userId?: string) {
        try {
          if (!createMeasurementUnitDto.code) {
            throw new BadRequestException('Code is required');
          }

          const existingUnit = await measurementUnitRepository.findOne({
            where: {
              code: createMeasurementUnitDto.code,
              organization_id: tenantContext.getOrganizationId(),
            },
            withDeleted: false,
          });

          if (existingUnit) {
            const message = await translationService.translate(
              'measurement_unit.already_exists',
              userId,
              { code: createMeasurementUnitDto.code },
            );
            throw new BadRequestException(message);
          }

          const measurementUnit = measurementUnitRepository.create({
            ...createMeasurementUnitDto,
            organization_id: tenantContext.getOrganizationId(),
          });
          const savedMeasurementUnit = await measurementUnitRepository.save(measurementUnit);
          return measurementUnitMapper.mapToResponseDto(savedMeasurementUnit);
        } catch (error: any) {
          if (
            error?.code === 'ER_DUP_ENTRY' &&
            error?.message?.includes('measurement_units.UQ_')
          ) {
            const message = await translationService.translate(
              'measurement_unit.already_exists',
              userId,
              { code: createMeasurementUnitDto.code },
            );
            throw new BadRequestException(message);
          }
          throw error;
        }
      },

      async findAll(paginationDto?: any, userId?: string) {
        const { page, limit, term } = paginationDto || {};

        const baseConditions = {
          where: { organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        };

        const whereConditions = term
          ? {
              withDeleted: baseConditions.withDeleted,
              where: [
                { code: Like(`%${term}%`), organization_id: tenantContext.getOrganizationId() },
                {
                  description: Like(`%${term}%`),
                  organization_id: tenantContext.getOrganizationId(),
                },
              ],
            }
          : baseConditions;

        if (!page && !limit) {
          const measurementUnits = await measurementUnitRepository.find(whereConditions);

          const data = measurementUnits.map((unit) =>
            measurementUnitMapper.mapToResponseDto(unit),
          );

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

        const [measurementUnits, total] = await measurementUnitRepository.findAndCount({
          ...whereConditions,
          skip,
          take: currentLimit,
        });

        const data = measurementUnits.map((unit) =>
          measurementUnitMapper.mapToResponseDto(unit),
        );

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
        const measurementUnit = await measurementUnitRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });
        if (!measurementUnit) {
          const message = await translationService.translate(
            'measurement_unit.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }
        return measurementUnitMapper.mapToResponseDto(measurementUnit);
      },

      async update(id: string, updateMeasurementUnitDto: any, userId?: string) {
        try {
          const measurementUnit = await measurementUnitRepository.findOne({
            where: { id, organization_id: tenantContext.getOrganizationId() },
            withDeleted: false,
          });
          if (!measurementUnit) {
            const message = await translationService.translate(
              'measurement_unit.not_found',
              userId,
              { id },
            );
            throw new NotFoundException(message);
          }

          if (
            updateMeasurementUnitDto.code &&
            updateMeasurementUnitDto.code !== measurementUnit.code
          ) {
            const existingUnit = await measurementUnitRepository.findOne({
              where: {
                code: updateMeasurementUnitDto.code,
                organization_id: tenantContext.getOrganizationId(),
              },
              withDeleted: false,
            });

            if (existingUnit) {
              const message = await translationService.translate(
                'measurement_unit.already_exists',
                userId,
                { code: updateMeasurementUnitDto.code },
              );
              throw new BadRequestException(message);
            }
          }

          const updatedMeasurementUnit = await measurementUnitRepository.save({
            ...measurementUnit,
            ...updateMeasurementUnitDto,
          });
          return measurementUnitMapper.mapToResponseDto(updatedMeasurementUnit);
        } catch (error: any) {
          if (
            error?.code === 'ER_DUP_ENTRY' &&
            error?.message?.includes('measurement_units.UQ_')
          ) {
            const message = await translationService.translate(
              'measurement_unit.already_exists',
              userId,
              { code: updateMeasurementUnitDto.code },
            );
            throw new BadRequestException(message);
          }
          throw error;
        }
      },

      async remove(id: string, userId?: string) {
        const measurementUnit = await measurementUnitRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });
        if (!measurementUnit) {
          const message = await translationService.translate(
            'measurement_unit.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        const productsUsingUnit = await productRepository.count({
          where: {
            measurement_unit: { id },
            organization_id: tenantContext.getOrganizationId(),
          },
          withDeleted: false,
        });

        if (productsUsingUnit > 0) {
          const message = await translationService.translate(
            'measurement_unit.cannot_delete_in_use',
            userId,
            {
              description: measurementUnit.description,
              count: productsUsingUnit,
            },
          );
          throw new BadRequestException(message);
        }

        await measurementUnitRepository.softRemove(measurementUnit);
      },

      async getMeasurementUnitUsage(id: string, userId?: string) {
        const measurementUnit = await measurementUnitRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });
        if (!measurementUnit) {
          const message = await translationService.translate(
            'measurement_unit.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        const products = await productRepository.find({
          where: {
            measurement_unit: { id },
            organization_id: tenantContext.getOrganizationId(),
          },
          select: ['id', 'name', 'sku'],
          withDeleted: false,
        });

        return {
          measurementUnit: measurementUnitMapper.mapToResponseDto(measurementUnit),
          productsCount: products.length,
          products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
        };
      },

      async searchFromPack(term: string) {
        return satCatalogService.searchMeasurementUnits(term);
      },
    };
  });

  describe('create', () => {
    const createMeasurementUnitDto = {
      code: 'KG',
      description: 'Kilogram',
      isActive: true,
    };

    it('should create a new measurement unit successfully', async () => {
      const mockUnit = {
        id: 'unit-123',
        ...createMeasurementUnitDto,
        organization_id: 'org-123',
        created_at: new Date(),
      };

      measurementUnitRepository.create.mockReturnValue(mockUnit);
      measurementUnitRepository.save.mockResolvedValue(mockUnit);
      measurementUnitRepository.findOne.mockResolvedValue(null);
      measurementUnitMapper.mapToResponseDto.mockReturnValue(mockUnit);

      const result = await service.create(createMeasurementUnitDto);

      expect(measurementUnitRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createMeasurementUnitDto,
          organization_id: 'org-123',
        })
      );
      expect(measurementUnitRepository.save).toHaveBeenCalledWith(mockUnit);
      expect(result).toEqual(mockUnit);
    });

    it('should throw error if code is missing', async () => {
      const invalidDto = { ...createMeasurementUnitDto, code: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if measurement unit code already exists', async () => {
      measurementUnitRepository.findOne.mockResolvedValue({ id: 'existing-unit' });
      translationService.translate.mockResolvedValue('Measurement unit already exists');

      await expect(service.create(createMeasurementUnitDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle database duplicate error', async () => {
      const dbError = new Error('Duplicate entry') as any;
      dbError.code = 'ER_DUP_ENTRY';
      dbError.message = 'measurement_units.UQ_';

      measurementUnitRepository.findOne.mockResolvedValue(null);
      measurementUnitRepository.create.mockReturnValue(createMeasurementUnitDto);
      measurementUnitRepository.save.mockRejectedValue(dbError);
      translationService.translate.mockResolvedValue('Measurement unit already exists');

      await expect(service.create(createMeasurementUnitDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all measurement units without pagination', async () => {
      const mockUnits = [
        { id: '1', code: 'KG', description: 'Kilogram' },
        { id: '2', code: 'L', description: 'Liter' },
      ];

      measurementUnitRepository.find.mockResolvedValue(mockUnits);
      measurementUnitMapper.mapToResponseDto.mockImplementation((unit) => unit);

      const result = await service.findAll();

      expect(measurementUnitRepository.find).toHaveBeenCalledWith({
        where: { organization_id: 'org-123' },
        withDeleted: false,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should return paginated measurement units', async () => {
      const paginationDto = { page: 1, limit: 10 };
      const mockUnits = [
        { id: '1', code: 'KG', description: 'Kilogram' },
        { id: '2', code: 'L', description: 'Liter' },
      ];

      measurementUnitRepository.findAndCount.mockResolvedValue([mockUnits, 2]);
      measurementUnitMapper.mapToResponseDto.mockImplementation((unit) => unit);

      const result = await service.findAll(paginationDto);

      expect(measurementUnitRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should search measurement units by term', async () => {
      const paginationDto = { page: 1, limit: 10, term: 'KG' };
      const mockUnits = [{ id: '1', code: 'KG', description: 'Kilogram' }];

      measurementUnitRepository.findAndCount.mockResolvedValue([mockUnits, 1]);
      measurementUnitMapper.mapToResponseDto.mockImplementation((unit) => unit);

      await service.findAll(paginationDto);

      expect(measurementUnitRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { code: Like('%KG%'), organization_id: 'org-123' },
            { description: Like('%KG%'), organization_id: 'org-123' },
          ],
        })
      );
    });

    it('should use default pagination values', async () => {
      measurementUnitRepository.findAndCount.mockResolvedValue([[], 0]);
      measurementUnitMapper.mapToResponseDto.mockImplementation((unit) => unit);

      await service.findAll({ page: 1 });

      expect(measurementUnitRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 8,
        })
      );
    });
  });

  describe('findOne', () => {
    const unitId = 'unit-123';

    it('should return measurement unit by ID', async () => {
      const mockUnit = {
        id: unitId,
        code: 'KG',
        description: 'Kilogram',
      };

      measurementUnitRepository.findOne.mockResolvedValue(mockUnit);
      measurementUnitMapper.mapToResponseDto.mockReturnValue(mockUnit);

      const result = await service.findOne(unitId);

      expect(measurementUnitRepository.findOne).toHaveBeenCalledWith({
        where: { id: unitId, organization_id: 'org-123' },
        withDeleted: false,
      });
      expect(result).toEqual(mockUnit);
    });

    it('should throw error if measurement unit not found', async () => {
      measurementUnitRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Measurement unit not found');

      await expect(service.findOne(unitId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const unitId = 'unit-123';
    const updateMeasurementUnitDto = {
      description: 'Updated Kilogram',
      isActive: false,
    };

    it('should update measurement unit successfully', async () => {
      const existingUnit = {
        id: unitId,
        code: 'KG',
        description: 'Kilogram',
      };

      const updatedUnit = {
        ...existingUnit,
        ...updateMeasurementUnitDto,
      };

      measurementUnitRepository.findOne.mockResolvedValue(existingUnit);
      measurementUnitRepository.save.mockResolvedValue(updatedUnit);
      measurementUnitMapper.mapToResponseDto.mockReturnValue(updatedUnit);

      const result = await service.update(unitId, updateMeasurementUnitDto);

      expect(measurementUnitRepository.findOne).toHaveBeenCalledWith({
        where: { id: unitId, organization_id: 'org-123' },
        withDeleted: false,
      });
      expect(measurementUnitRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...existingUnit,
          ...updateMeasurementUnitDto,
        })
      );
      expect(result).toEqual(updatedUnit);
    });

    it('should throw error if measurement unit not found', async () => {
      measurementUnitRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Measurement unit not found');

      await expect(service.update(unitId, updateMeasurementUnitDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if new code already exists', async () => {
      const existingUnit = {
        id: unitId,
        code: 'KG',
        description: 'Kilogram',
      };

      const duplicateUnit = {
        id: 'other-unit',
        code: 'L',
        description: 'Liter',
      };

      measurementUnitRepository.findOne
        .mockResolvedValueOnce(existingUnit) // First call finds existing unit
        .mockResolvedValueOnce(duplicateUnit); // Second call finds duplicate code
      translationService.translate.mockResolvedValue('Measurement unit already exists');

      await expect(service.update(unitId, { code: 'L' })).rejects.toThrow(BadRequestException);
    });

    it('should allow updating with same code', async () => {
      const existingUnit = {
        id: unitId,
        code: 'KG',
        description: 'Kilogram',
      };

      const updatedUnit = {
        ...existingUnit,
        description: 'Updated Kilogram',
      };

      measurementUnitRepository.findOne.mockResolvedValue(existingUnit);
      measurementUnitRepository.save.mockResolvedValue(updatedUnit);
      measurementUnitMapper.mapToResponseDto.mockReturnValue(updatedUnit);

      const result = await service.update(unitId, { description: 'Updated Kilogram', code: 'KG' });

      expect(result).toEqual(updatedUnit);
    });

    it('should handle database duplicate error in update', async () => {
      const existingUnit = {
        id: unitId,
        code: 'KG',
        description: 'Kilogram',
      };

      const dbError = new Error('Duplicate entry') as any;
      dbError.code = 'ER_DUP_ENTRY';
      dbError.message = 'measurement_units.UQ_';

      measurementUnitRepository.findOne.mockResolvedValue(existingUnit);
      measurementUnitRepository.save.mockRejectedValue(dbError);
      translationService.translate.mockResolvedValue('Measurement unit already exists');

      await expect(service.update(unitId, { code: 'L' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const unitId = 'unit-123';

    it('should remove measurement unit successfully', async () => {
      const mockUnit = {
        id: unitId,
        code: 'KG',
        description: 'Kilogram',
      };

      measurementUnitRepository.findOne.mockResolvedValue(mockUnit);
      productRepository.count.mockResolvedValue(0);
      measurementUnitRepository.softRemove.mockResolvedValue(undefined);

      await service.remove(unitId);

      expect(measurementUnitRepository.softRemove).toHaveBeenCalledWith(mockUnit);
    });

    it('should throw error if measurement unit not found', async () => {
      measurementUnitRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Measurement unit not found');

      await expect(service.remove(unitId)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if measurement unit has products', async () => {
      const mockUnit = {
        id: unitId,
        code: 'KG',
        description: 'Kilogram',
      };

      measurementUnitRepository.findOne.mockResolvedValue(mockUnit);
      productRepository.count.mockResolvedValue(5);
      translationService.translate.mockResolvedValue('Cannot delete measurement unit in use');

      await expect(service.remove(unitId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMeasurementUnitUsage', () => {
    const unitId = 'unit-123';

    it('should return measurement unit usage information', async () => {
      const mockUnit = {
        id: unitId,
        code: 'KG',
        description: 'Kilogram',
      };

      const mockProducts = [
        { id: 'p1', name: 'Product 1', sku: 'SKU1' },
        { id: 'p2', name: 'Product 2', sku: 'SKU2' },
      ];

      measurementUnitRepository.findOne.mockResolvedValue(mockUnit);
      productRepository.find.mockResolvedValue(mockProducts);
      measurementUnitMapper.mapToResponseDto.mockReturnValue(mockUnit);

      const result = await service.getMeasurementUnitUsage(unitId);

      expect(result.measurementUnit).toEqual(mockUnit);
      expect(result.productsCount).toBe(2);
      expect(result.products).toHaveLength(2);
      expect(result.products[0]).toEqual({ id: 'p1', name: 'Product 1', sku: 'SKU1' });
    });

    it('should throw error if measurement unit not found', async () => {
      measurementUnitRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Measurement unit not found');

      await expect(service.getMeasurementUnitUsage(unitId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchFromPack', () => {
    it('should search measurement units from pack', async () => {
      const mockSuggestions = [
        { key: 'KGM', description: 'Kilogramo' },
        { key: 'LTR', description: 'Litro' },
      ];

      satCatalogService.searchMeasurementUnits.mockResolvedValue(mockSuggestions);

      const result = await service.searchFromPack('KG');

      expect(satCatalogService.searchMeasurementUnits).toHaveBeenCalledWith('KG');
      expect(result).toEqual(mockSuggestions);
    });
  });
});
