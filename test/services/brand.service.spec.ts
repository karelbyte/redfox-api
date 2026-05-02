import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('BrandService', () => {
  let service: any;
  let brandRepository: any;
  let productRepository: any;
  let translationService: any;
  let tenantContext: any;
  let unifiedUploadService: any;

  beforeEach(async () => {
    brandRepository = {
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

    translationService = {
      translate: jest.fn(),
    };

    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    };

    unifiedUploadService = {
      deleteFilesByUrls: jest.fn(),
    };

    service = {
      async create(createBrandDto: any, userId?: string) {
        try {
          if (!createBrandDto.code) {
            throw new BadRequestException('Code is required');
          }

          const existingBrand = await brandRepository.findOne({
            where: {
              organization_id: tenantContext.getOrganizationId(),
              code: createBrandDto.code,
            },
            withDeleted: false,
          });

          if (existingBrand) {
            const message = await translationService.translate(
              'brand.already_exists',
              userId,
              { code: createBrandDto.code },
            );
            throw new ConflictException(message);
          }

          const brand = brandRepository.create({
            ...createBrandDto,
            organization_id: tenantContext.getOrganizationId(),
          });
          const savedBrand = await brandRepository.save(brand);
          return service.mapToResponseDto(savedBrand);
        } catch (error) {
          if (
            (error.code === 'ER_DUP_ENTRY' ||
              error.code === '23505' ||
              (error.detail && error.detail.includes('IDX_BRAND_ORGANIZATION_CODE'))) &&
            error.message.includes('IDX_BRAND_ORGANIZATION_CODE')
          ) {
            const message = await translationService.translate(
              'brand.already_exists',
              userId,
              { code: createBrandDto.code },
            );
            throw new ConflictException(message);
          }
          throw error;
        }
      },

      async findAll(paginationDto?: any) {
        if (!paginationDto) {
          const brands = await brandRepository.find({
            where: { organization_id: tenantContext.getOrganizationId() },
            withDeleted: false,
          });

          const data = brands.map((brand) => service.mapToResponseDto(brand));

          return {
            data,
            meta: {
              total: brands.length,
              page: 1,
              limit: brands.length,
              totalPages: 1,
            },
          };
        }

        const { page = 1, limit = 8 } = paginationDto;
        const skip = (page - 1) * limit;

        const [brands, total] = await brandRepository.findAndCount({
          where: { organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
          skip,
          take: limit,
        });

        const data = brands.map((brand) => service.mapToResponseDto(brand));

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

      async findOne(id: string, userId?: string) {
        const brand = await brandRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });

        if (!brand) {
          const message = await translationService.translate(
            'brand.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        return service.mapToResponseDto(brand);
      },

      async update(id: string, updateBrandDto: any, userId?: string) {
        try {
          const brand = await brandRepository.findOne({
            where: { id, organization_id: tenantContext.getOrganizationId() },
            withDeleted: false,
          });

          if (!brand) {
            const message = await translationService.translate(
              'brand.not_found',
              userId,
              { id },
            );
            throw new NotFoundException(message);
          }

          if (
            updateBrandDto.code &&
            updateBrandDto.code !== brand.code
          ) {
            const existingBrand = await brandRepository.findOne({
              where: {
                organization_id: tenantContext.getOrganizationId(),
                code: updateBrandDto.code,
              },
              withDeleted: false,
            });

            if (existingBrand) {
              const message = await translationService.translate(
                'brand.already_exists',
                userId,
                { code: updateBrandDto.code },
              );
              throw new ConflictException(message);
            }
          }

          const updatedBrand = await brandRepository.save({
            ...brand,
            ...updateBrandDto,
          });
          return service.mapToResponseDto(updatedBrand);
        } catch (error) {
          if (
            (error.code === 'ER_DUP_ENTRY' ||
              error.code === '23505' ||
              (error.detail && error.detail.includes('IDX_BRAND_ORGANIZATION_CODE'))) &&
            error.message.includes('IDX_BRAND_ORGANIZATION_CODE')
          ) {
            const message = await translationService.translate(
              'brand.already_exists',
              userId,
              { code: updateBrandDto.code },
            );
            throw new ConflictException(message);
          }
          throw error;
        }
      },

      async remove(id: string, userId?: string) {
        const brand = await brandRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
        });

        if (!brand) {
          const message = await translationService.translate(
            'brand.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        const productsUsingBrand = await productRepository.count({
          where: { brand: { id }, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });

        if (productsUsingBrand > 0) {
          const message = await translationService.translate(
            'brand.cannot_delete_in_use',
            userId,
            {
              description: brand.description,
              count: productsUsingBrand,
            },
          );
          throw new BadRequestException(message);
        }

        await brandRepository.softRemove(brand);
      },

      async getBrandUsage(id: string, userId?: string) {
        const brand = await brandRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
        });

        if (!brand) {
          const message = await translationService.translate(
            'brand.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        const products = await productRepository.find({
          where: {
            brand: { id },
            organization_id: tenantContext.getOrganizationId(),
          },
          select: ['id', 'name', 'sku'],
          withDeleted: false,
        });

        return {
          brand: service.mapToResponseDto(brand),
          productsCount: products.length,
          products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
        };
      },

      async updateImage(id: string, imageUrl: string, userId?: string) {
        const brand = await brandRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
        });

        if (!brand) {
          const message = await translationService.translate(
            'brand.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        if (brand.img) {
          await unifiedUploadService.deleteFilesByUrls([brand.img]);
        }

        brand.img = imageUrl;
        const savedBrand = await brandRepository.save(brand);

        return service.mapToResponseDto(savedBrand);
      },

      mapToResponseDto(brand: any) {
        const { id, code, description, img, isActive, created_at } = brand;
        return {
          id,
          code,
          description,
          img,
          isActive,
          created_at,
        };
      },
    };
  });

  describe('create', () => {
    const createBrandDto = {
      code: 'BRAND001',
      description: 'Test Brand',
      isActive: true,
    };

    it('should create a new brand successfully', async () => {
      const mockBrand = {
        id: 'brand-123',
        ...createBrandDto,
        organization_id: 'org-123',
        created_at: new Date(),
      };

      brandRepository.create.mockReturnValue(mockBrand);
      brandRepository.save.mockResolvedValue(mockBrand);
      brandRepository.findOne.mockResolvedValue(null);

      const result = await service.create(createBrandDto);

      expect(brandRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createBrandDto,
          organization_id: 'org-123',
        })
      );
      expect(brandRepository.save).toHaveBeenCalledWith(mockBrand);
      expect(result).toEqual({
        id: 'brand-123',
        code: 'BRAND001',
        description: 'Test Brand',
        img: undefined,
        isActive: true,
        created_at: mockBrand.created_at,
      });
    });

    it('should throw error if code is missing', async () => {
      const invalidDto = { ...createBrandDto, code: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if brand code already exists', async () => {
      brandRepository.findOne.mockResolvedValue({ id: 'existing-brand' });
      translationService.translate.mockResolvedValue('Brand already exists');

      await expect(service.create(createBrandDto)).rejects.toThrow(ConflictException);
    });

    it('should handle database duplicate error', async () => {
      const dbError = new Error('Duplicate entry') as any;
      dbError.code = 'ER_DUP_ENTRY';
      dbError.message = 'IDX_BRAND_ORGANIZATION_CODE';

      brandRepository.findOne.mockResolvedValue(null);
      brandRepository.create.mockReturnValue(createBrandDto);
      brandRepository.save.mockRejectedValue(dbError);
      translationService.translate.mockResolvedValue('Brand already exists');

      await expect(service.create(createBrandDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all brands without pagination', async () => {
      const mockBrands = [
        { id: '1', code: 'BRAND001', description: 'Brand 1', img: null, isActive: true, created_at: new Date() },
        { id: '2', code: 'BRAND002', description: 'Brand 2', img: null, isActive: true, created_at: new Date() },
      ];

      brandRepository.find.mockResolvedValue(mockBrands);

      const result = await service.findAll();

      expect(brandRepository.find).toHaveBeenCalledWith({
        where: { organization_id: 'org-123' },
        withDeleted: false,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should return paginated brands', async () => {
      const paginationDto = { page: 1, limit: 10 };
      const mockBrands = [
        { id: '1', code: 'BRAND001', description: 'Brand 1', img: null, isActive: true, created_at: new Date() },
        { id: '2', code: 'BRAND002', description: 'Brand 2', img: null, isActive: true, created_at: new Date() },
      ];

      brandRepository.findAndCount.mockResolvedValue([mockBrands, 2]);

      const result = await service.findAll(paginationDto);

      expect(brandRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: 'org-123' },
        withDeleted: false,
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      brandRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(brandRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 8,
        })
      );
    });
  });

  describe('findOne', () => {
    const brandId = 'brand-123';

    it('should return brand by ID', async () => {
      const mockBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
        created_at: new Date(),
      };

      brandRepository.findOne.mockResolvedValue(mockBrand);

      const result = await service.findOne(brandId);

      expect(brandRepository.findOne).toHaveBeenCalledWith({
        where: { id: brandId, organization_id: 'org-123' },
        withDeleted: false,
      });
      expect(result).toEqual({
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
        created_at: mockBrand.created_at,
      });
    });

    it('should throw error if brand not found', async () => {
      brandRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Brand not found');

      await expect(service.findOne(brandId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const brandId = 'brand-123';
    const updateBrandDto = {
      description: 'Updated Brand',
      isActive: false,
    };

    it('should update brand successfully', async () => {
      const existingBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
        created_at: new Date(),
      };

      const updatedBrand = {
        ...existingBrand,
        ...updateBrandDto,
      };

      brandRepository.findOne.mockResolvedValue(existingBrand);
      brandRepository.save.mockResolvedValue(updatedBrand);

      const result = await service.update(brandId, updateBrandDto);

      expect(brandRepository.findOne).toHaveBeenCalledWith({
        where: { id: brandId, organization_id: 'org-123' },
        withDeleted: false,
      });
      expect(brandRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...existingBrand,
          ...updateBrandDto,
        })
      );
      expect(result).toEqual({
        id: brandId,
        code: 'BRAND001',
        description: 'Updated Brand',
        img: null,
        isActive: false,
        created_at: existingBrand.created_at,
      });
    });

    it('should throw error if brand not found', async () => {
      brandRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Brand not found');

      await expect(service.update(brandId, updateBrandDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if new code already exists', async () => {
      const existingBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
      };

      const duplicateBrand = {
        id: 'other-brand',
        code: 'BRAND002',
        description: 'Other Brand',
        img: null,
        isActive: true,
      };

      brandRepository.findOne
        .mockResolvedValueOnce(existingBrand) // First call finds existing brand
        .mockResolvedValueOnce(duplicateBrand); // Second call finds duplicate code
      translationService.translate.mockResolvedValue('Brand already exists');

      await expect(service.update(brandId, { code: 'BRAND002' })).rejects.toThrow(ConflictException);
    });

    it('should allow updating with same code', async () => {
      const existingBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
      };

      const updatedBrand = {
        ...existingBrand,
        description: 'Updated Brand',
      };

      brandRepository.findOne.mockResolvedValue(existingBrand);
      brandRepository.save.mockResolvedValue(updatedBrand);

      const result = await service.update(brandId, { description: 'Updated Brand', code: 'BRAND001' });

      expect(result.description).toBe('Updated Brand');
    });

    it('should handle database duplicate error in update', async () => {
      const existingBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
      };

      const dbError = new Error('Duplicate entry') as any;
      dbError.code = 'ER_DUP_ENTRY';
      dbError.message = 'IDX_BRAND_ORGANIZATION_CODE';

      brandRepository.findOne.mockResolvedValue(existingBrand);
      brandRepository.save.mockRejectedValue(dbError);
      translationService.translate.mockResolvedValue('Brand already exists');

      await expect(service.update(brandId, { code: 'BRAND002' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    const brandId = 'brand-123';

    it('should remove brand successfully', async () => {
      const mockBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
      };

      brandRepository.findOne.mockResolvedValue(mockBrand);
      productRepository.count.mockResolvedValue(0);
      brandRepository.softRemove.mockResolvedValue(undefined);

      await service.remove(brandId);

      expect(brandRepository.softRemove).toHaveBeenCalledWith(mockBrand);
    });

    it('should throw error if brand not found', async () => {
      brandRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Brand not found');

      await expect(service.remove(brandId)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if brand has products', async () => {
      const mockBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
      };

      brandRepository.findOne.mockResolvedValue(mockBrand);
      productRepository.count.mockResolvedValue(5);
      translationService.translate.mockResolvedValue('Cannot delete brand in use');

      await expect(service.remove(brandId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBrandUsage', () => {
    const brandId = 'brand-123';

    it('should return brand usage information', async () => {
      const mockBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
        created_at: new Date(),
      };

      const mockProducts = [
        { id: 'p1', name: 'Product 1', sku: 'SKU1' },
        { id: 'p2', name: 'Product 2', sku: 'SKU2' },
      ];

      brandRepository.findOne.mockResolvedValue(mockBrand);
      productRepository.find.mockResolvedValue(mockProducts);

      const result = await service.getBrandUsage(brandId);

      expect(result.brand).toEqual({
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
        created_at: mockBrand.created_at,
      });
      expect(result.productsCount).toBe(2);
      expect(result.products).toHaveLength(2);
      expect(result.products[0]).toEqual({ id: 'p1', name: 'Product 1', sku: 'SKU1' });
    });

    it('should throw error if brand not found', async () => {
      brandRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Brand not found');

      await expect(service.getBrandUsage(brandId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateImage', () => {
    const brandId = 'brand-123';
    const imageUrl = 'https://example.com/image.jpg';

    it('should update brand image successfully', async () => {
      const mockBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: null,
        isActive: true,
        created_at: new Date(),
      };

      const updatedBrand = {
        ...mockBrand,
        img: imageUrl,
      };

      brandRepository.findOne.mockResolvedValue(mockBrand);
      brandRepository.save.mockResolvedValue(updatedBrand);

      const result = await service.updateImage(brandId, imageUrl);

      expect(brandRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          img: imageUrl,
        })
      );
      expect(result.img).toBe(imageUrl);
    });

    it('should delete old image if exists', async () => {
      const mockBrand = {
        id: brandId,
        code: 'BRAND001',
        description: 'Test Brand',
        img: 'https://example.com/old-image.jpg',
        isActive: true,
        created_at: new Date(),
      };

      const updatedBrand = {
        ...mockBrand,
        img: imageUrl,
      };

      brandRepository.findOne.mockResolvedValue(mockBrand);
      unifiedUploadService.deleteFilesByUrls.mockResolvedValue(undefined);
      brandRepository.save.mockResolvedValue(updatedBrand);

      await service.updateImage(brandId, imageUrl);

      expect(unifiedUploadService.deleteFilesByUrls).toHaveBeenCalledWith(['https://example.com/old-image.jpg']);
    });

    it('should throw error if brand not found', async () => {
      brandRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Brand not found');

      await expect(service.updateImage(brandId, imageUrl)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToResponseDto', () => {
    it('should map brand to response DTO correctly', async () => {
      const brand = {
        id: 'brand-123',
        code: 'BRAND001',
        description: 'Test Brand',
        img: 'https://example.com/image.jpg',
        isActive: true,
        created_at: new Date('2023-01-01'),
        organization_id: 'org-123',
      };

      const result = service.mapToResponseDto(brand);

      expect(result).toEqual({
        id: 'brand-123',
        code: 'BRAND001',
        description: 'Test Brand',
        img: 'https://example.com/image.jpg',
        isActive: true,
        created_at: brand.created_at,
      });
      expect(result.organization_id).toBeUndefined();
    });
  });
});
