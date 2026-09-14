import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, Like, FindManyOptions, IsNull } from 'typeorm';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';

describe('CategoryService', () => {
  let service: any;
  let categoryRepository: any;
  let productRepository: any;
  let dataSource: any;
  let categoryMapper: any;
  let translationService: any;
  let tenantContext: any;
  let unifiedUploadService: any;

  beforeEach(async () => {
    categoryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    productRepository = {
      count: jest.fn(),
      find: jest.fn(),
    };

    dataSource = {
      createQueryRunner: jest.fn(),
    };

    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager: {
        findOne: jest.fn(),
        update: jest.fn(),
      },
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };

    dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

    categoryMapper = {
      mapToResponseDto: jest.fn(),
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
      async create(createCategoryDto: any, userId?: string) {
        if (!createCategoryDto.name) {
          throw new BadRequestException('Name is required');
        }

        if (createCategoryDto.parentId) {
          const parentCategory = await categoryRepository.findOne({
            where: {
              id: createCategoryDto.parentId,
              organization_id: tenantContext.getOrganizationId(),
            },
          });

          if (!parentCategory) {
            const message = await translationService.translate(
              'category.parent_not_found',
              userId,
              { id: createCategoryDto.parentId },
            );
            throw new BadRequestException(message);
          }
        }

        const baseSlug = (createCategoryDto.slug || createCategoryDto.name)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        let slug = baseSlug;
        let suffix = 1;
        while (
          await categoryRepository.findOne({
            where: { slug, organization_id: tenantContext.getOrganizationId() },
          })
        ) {
          slug = `${baseSlug}-${suffix++}`;
        }

        const category = categoryRepository.create({
          ...createCategoryDto,
          slug,
          organization_id: tenantContext.getOrganizationId(),
        });
        const savedCategory = await categoryRepository.save(category);
        return categoryMapper.mapToResponseDto(savedCategory);
      },

      async findAll(paginationDto?: any) {
        const { page, limit, term } = paginationDto || {};

        const baseConditions: FindManyOptions<any> = {
          relations: ['children'],
          where: { parentId: IsNull(), organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
          order: {
            position: 'ASC',
            createdAt: 'DESC',
          },
        };

        const whereConditions: FindManyOptions<any> = term
          ? {
              relations: baseConditions.relations,
              withDeleted: baseConditions.withDeleted,
              order: baseConditions.order,
              where: [
                {
                  name: Like(`%${term}%`),
                  organization_id: tenantContext.getOrganizationId(),
                  parentId: IsNull(),
                },
                {
                  slug: Like(`%${term}%`),
                  organization_id: tenantContext.getOrganizationId(),
                  parentId: IsNull(),
                },
                {
                  description: Like(`%${term}%`),
                  organization_id: tenantContext.getOrganizationId(),
                  parentId: IsNull(),
                },
              ],
            }
          : baseConditions;

        if (!page && !limit) {
          const categories = await categoryRepository.find(whereConditions);
          const data = categories.map((category) => categoryMapper.mapToResponseDto(category));

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

        const [categories, total] = await categoryRepository.findAndCount({
          ...whereConditions,
          skip,
          take: currentLimit,
        });

        const data = categories.map((category) => categoryMapper.mapToResponseDto(category));

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
        const category = await categoryRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          relations: ['children'],
          withDeleted: false,
        });
        if (!category) {
          const message = await translationService.translate(
            'category.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }
        return categoryMapper.mapToResponseDto(category);
      },

      async update(id: string, updateCategoryDto: any, userId?: string) {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const category = await queryRunner.manager.findOne('Category', {
            where: { id, organization_id: tenantContext.getOrganizationId() },
            relations: ['children'],
            withDeleted: false,
          });

          if (!category) {
            const message = await translationService.translate(
              'category.not_found',
              userId,
              { id },
            );
            throw new NotFoundException(message);
          }

          if (updateCategoryDto.parentId) {
            if (updateCategoryDto.parentId === id) {
              const message = await translationService.translate(
                'category.cannot_be_own_parent',
                userId,
              );
              throw new BadRequestException(message);
            }

            const parentCategory = await queryRunner.manager.findOne('Category', {
              where: {
                id: updateCategoryDto.parentId,
                organization_id: tenantContext.getOrganizationId(),
              },
            });

            if (!parentCategory) {
              const message = await translationService.translate(
                'category.parent_not_found',
                userId,
                { id: updateCategoryDto.parentId },
              );
              throw new BadRequestException(message);
            }

            if (category.children && category.children.length > 0) {
              const message = await translationService.translate(
                'category.cannot_change_parent_with_children',
                userId,
              );
              throw new BadRequestException(message);
            }
          }

          if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
            const existingCategory = await queryRunner.manager.findOne('Category', {
              where: {
                slug: updateCategoryDto.slug,
                organization_id: tenantContext.getOrganizationId(),
              },
            });

            if (existingCategory) {
              const message = await translationService.translate(
                'category.already_exists',
                userId,
                { slug: updateCategoryDto.slug },
              );
              throw new BadRequestException(message);
            }
          }

          await queryRunner.manager.update(
            'Category',
            { id, organization_id: tenantContext.getOrganizationId() },
            updateCategoryDto,
          );

          const updatedCategory = await queryRunner.manager.findOne('Category', {
            where: { id, organization_id: tenantContext.getOrganizationId() },
            relations: ['children'],
            withDeleted: false,
          });

          if (!updatedCategory) {
            const message = await translationService.translate(
              'category.not_found',
              userId,
              { id },
            );
            throw new NotFoundException(message);
          }

          await queryRunner.commitTransaction();
          return categoryMapper.mapToResponseDto(updatedCategory);
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      },

      async remove(id: string, userId?: string) {
        const category = await categoryRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });
        if (!category) {
          const message = await translationService.translate(
            'category.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        const productsUsingCategory = await productRepository.count({
          where: {
            category: { id },
            organization_id: tenantContext.getOrganizationId(),
          },
          withDeleted: false,
        });

        if (productsUsingCategory > 0) {
          const message = await translationService.translate(
            'category.cannot_delete_in_use',
            userId,
            { name: category.name, count: productsUsingCategory },
          );
          throw new BadRequestException(message);
        }

        const hasChildren = await categoryRepository.count({
          where: {
            parentId: id,
            organization_id: tenantContext.getOrganizationId(),
          },
          withDeleted: false,
        });

        if (hasChildren > 0) {
          const message = await translationService.translate(
            'category.cannot_delete_with_children',
            userId,
            { name: category.name, count: hasChildren },
          );
          throw new BadRequestException(message);
        }

        await categoryRepository.softRemove(category);
      },

      async findBySlug(slug: string, userId?: string) {
        const category = await categoryRepository.findOne({
          where: { slug, organization_id: tenantContext.getOrganizationId() },
          relations: ['children'],
          withDeleted: false,
        });
        if (!category) {
          const message = await translationService.translate(
            'category.slug_not_found',
            userId,
            { slug },
          );
          throw new NotFoundException(message);
        }
        return categoryMapper.mapToResponseDto(category);
      },

      async findByParentId(parentId: string, paginationDto: any, userId?: string) {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;

        const parent = await categoryRepository.findOne({
          where: { id: parentId, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });

        if (!parent) {
          const message = await translationService.translate(
            'category.parent_not_found',
            userId,
            { id: parentId },
          );
          throw new NotFoundException(message);
        }

        const [categories, total] = await categoryRepository.findAndCount({
          where: { parentId, organization_id: tenantContext.getOrganizationId() },
          relations: ['children'],
          withDeleted: false,
          skip,
          take: limit,
          order: {
            position: 'ASC',
            createdAt: 'DESC',
          },
        });

        const data = categories.map((category) => categoryMapper.mapToResponseDto(category));

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

      async getCategoryUsage(id: string) {
        const category = await categoryRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });
        if (!category) {
          throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
        }

        const products = await productRepository.find({
          where: {
            category: { id },
            organization_id: tenantContext.getOrganizationId(),
          },
          select: ['id', 'name', 'sku'],
          withDeleted: false,
        });

        const childrenCount = await categoryRepository.count({
          where: {
            parentId: id,
            organization_id: tenantContext.getOrganizationId(),
          },
          withDeleted: false,
        });

        return {
          category: categoryMapper.mapToResponseDto(category),
          productsCount: products.length,
          products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
          childrenCount,
        };
      },

      async updateImage(id: string, imageUrl: string, userId?: string) {
        const category = await categoryRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
        });

        if (!category) {
          const message = await translationService.translate(
            'category.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        if (category.image) {
          await unifiedUploadService.deleteFilesByUrls([category.image]);
        }

        category.image = imageUrl;
        const savedCategory = await categoryRepository.save(category);

        return categoryMapper.mapToResponseDto(savedCategory);
      },
    };
  });

  describe('create', () => {
    const createCategoryDto = {
      name: 'Test Category',
      description: 'Test Description',
    };

    it('should create a new category successfully', async () => {
      const mockCategory = {
        id: 'category-123',
        ...createCategoryDto,
        slug: 'test-category',
        organization_id: 'org-123',
        created_at: new Date(),
      };

      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockResolvedValue(mockCategory);
      categoryRepository.findOne.mockResolvedValue(null);
      categoryMapper.mapToResponseDto.mockReturnValue(mockCategory);

      const result = await service.create(createCategoryDto);

      expect(categoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createCategoryDto,
          slug: 'test-category',
          organization_id: 'org-123',
        })
      );
      expect(categoryRepository.save).toHaveBeenCalledWith(mockCategory);
      expect(result).toEqual(mockCategory);
    });

    it('should throw error if name is missing', async () => {
      const invalidDto = { ...createCategoryDto, name: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if parent category not found', async () => {
      const dtoWithParent = { ...createCategoryDto, parentId: 'parent-123' };
      categoryRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Parent not found');

      await expect(service.create(dtoWithParent)).rejects.toThrow(BadRequestException);
    });

    it('should generate unique slug if already exists', async () => {
      const mockCategory = {
        id: 'category-123',
        ...createCategoryDto,
        slug: 'test-category-1',
        organization_id: 'org-123',
      };

      categoryRepository.findOne
        .mockResolvedValueOnce({ id: 'existing' }) // First call finds existing 'test-category'
        .mockResolvedValueOnce(null); // Second call finds 'test-category-1' is unique
      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockResolvedValue(mockCategory);
      categoryMapper.mapToResponseDto.mockReturnValue(mockCategory);

      await service.create(createCategoryDto);

      expect(categoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'test-category-1',
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all categories without pagination', async () => {
      const mockCategories = [
        { id: '1', name: 'Category 1', children: [] },
        { id: '2', name: 'Category 2', children: [] },
      ];

      categoryRepository.find.mockResolvedValue(mockCategories);
      categoryMapper.mapToResponseDto.mockImplementation((category) => category);

      const result = await service.findAll();

      expect(categoryRepository.find).toHaveBeenCalledWith({
        relations: ['children'],
        where: { parentId: IsNull(), organization_id: 'org-123' },
        withDeleted: false,
        order: {
          position: 'ASC',
          createdAt: 'DESC',
        },
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should return paginated categories', async () => {
      const paginationDto = { page: 1, limit: 10 };
      const mockCategories = [
        { id: '1', name: 'Category 1', children: [] },
        { id: '2', name: 'Category 2', children: [] },
      ];

      categoryRepository.findAndCount.mockResolvedValue([mockCategories, 2]);
      categoryMapper.mapToResponseDto.mockImplementation((category) => category);

      const result = await service.findAll(paginationDto);

      expect(categoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should search categories by term', async () => {
      const paginationDto = { page: 1, limit: 10, term: 'test' };
      const mockCategories = [{ id: '1', name: 'Test Category', children: [] }];

      categoryRepository.findAndCount.mockResolvedValue([mockCategories, 1]);
      categoryMapper.mapToResponseDto.mockImplementation((category) => category);

      await service.findAll(paginationDto);

      expect(categoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            {
              name: Like('%test%'),
              organization_id: 'org-123',
              parentId: IsNull(),
            },
            {
              slug: Like('%test%'),
              organization_id: 'org-123',
              parentId: IsNull(),
            },
            {
              description: Like('%test%'),
              organization_id: 'org-123',
              parentId: IsNull(),
            },
          ],
        })
      );
    });
  });

  describe('findOne', () => {
    const categoryId = 'category-123';

    it('should return category by ID', async () => {
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
        children: [],
      };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      categoryMapper.mapToResponseDto.mockReturnValue(mockCategory);

      const result = await service.findOne(categoryId);

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: categoryId, organization_id: 'org-123' },
        relations: ['children'],
        withDeleted: false,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should throw error if category not found', async () => {
      categoryRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Category not found');

      await expect(service.findOne(categoryId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const categoryId = 'category-123';
    const updateCategoryDto = {
      name: 'Updated Category',
      description: 'Updated Description',
    };

    it('should update category successfully', async () => {
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
        children: [],
      };

      const updatedCategory = {
        ...mockCategory,
        ...updateCategoryDto,
      };

      const mockQueryRunner = dataSource.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockCategory);
      mockQueryRunner.manager.update.mockResolvedValue(undefined);
      mockQueryRunner.manager.findOne.mockResolvedValue(updatedCategory);

      categoryMapper.mapToResponseDto.mockReturnValue(updatedCategory);

      const result = await service.update(categoryId, updateCategoryDto);

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        'Category',
        { id: categoryId, organization_id: 'org-123' },
        updateCategoryDto
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should throw error if category not found', async () => {
      const mockQueryRunner = dataSource.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Category not found');

      await expect(service.update(categoryId, updateCategoryDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if trying to set self as parent', async () => {
      const mockCategory = { id: categoryId, name: 'Test Category', children: [] };
      const mockQueryRunner = dataSource.createQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockCategory);
      translationService.translate.mockResolvedValue('Cannot be own parent');

      await expect(service.update(categoryId, { parentId: categoryId })).rejects.toThrow(BadRequestException);
    });

    it('should throw error if parent not found', async () => {
      const mockCategory = { id: categoryId, name: 'Test Category', children: [] };
      const mockQueryRunner = dataSource.createQueryRunner();
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockCategory) // First call finds category
        .mockResolvedValueOnce(null); // Second call doesn't find parent
      translationService.translate.mockResolvedValue('Parent not found');

      await expect(service.update(categoryId, { parentId: 'parent-123' })).rejects.toThrow(BadRequestException);
    });

    it('should throw error if slug already exists', async () => {
      const mockCategory = { id: categoryId, name: 'Test Category', slug: 'old-slug', children: [] };
      const duplicateCategory = { id: 'other', name: 'Other', slug: 'new-slug' };
      const mockQueryRunner = dataSource.createQueryRunner();
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockCategory) // First call finds category
        .mockResolvedValueOnce(duplicateCategory); // Second call finds duplicate slug
      translationService.translate.mockResolvedValue('Slug already exists');

      await expect(service.update(categoryId, { slug: 'new-slug' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const categoryId = 'category-123';

    it('should remove category successfully', async () => {
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
      };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      productRepository.count.mockResolvedValue(0);
      categoryRepository.count.mockResolvedValue(0);
      categoryRepository.softRemove.mockResolvedValue(undefined);

      await service.remove(categoryId);

      expect(categoryRepository.softRemove).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw error if category not found', async () => {
      categoryRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Category not found');

      await expect(service.remove(categoryId)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if category has products', async () => {
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
      };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      productRepository.count.mockResolvedValue(5);
      translationService.translate.mockResolvedValue('Cannot delete category in use');

      await expect(service.remove(categoryId)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if category has children', async () => {
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
      };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      productRepository.count.mockResolvedValue(0);
      categoryRepository.count.mockResolvedValue(3);
      translationService.translate.mockResolvedValue('Cannot delete category with children');

      await expect(service.remove(categoryId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findBySlug', () => {
    const slug = 'test-category';

    it('should return category by slug', async () => {
      const mockCategory = {
        id: 'category-123',
        slug: slug,
        name: 'Test Category',
        children: [],
      };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      categoryMapper.mapToResponseDto.mockReturnValue(mockCategory);

      const result = await service.findBySlug(slug);

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug, organization_id: 'org-123' },
        relations: ['children'],
        withDeleted: false,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should throw error if category not found', async () => {
      categoryRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Category not found');

      await expect(service.findBySlug(slug)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByParentId', () => {
    const parentId = 'parent-123';

    it('should return categories by parent ID', async () => {
      const mockParent = { id: parentId, name: 'Parent Category' };
      const mockCategories = [
        { id: '1', name: 'Child 1', children: [] },
        { id: '2', name: 'Child 2', children: [] },
      ];

      categoryRepository.findOne.mockResolvedValue(mockParent);
      categoryRepository.findAndCount.mockResolvedValue([mockCategories, 2]);
      categoryMapper.mapToResponseDto.mockImplementation((category) => category);

      const result = await service.findByParentId(parentId, { page: 1, limit: 10 });

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: parentId, organization_id: 'org-123' },
        withDeleted: false,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should throw error if parent not found', async () => {
      categoryRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Parent not found');

      await expect(service.findByParentId(parentId, { page: 1, limit: 10 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategoryUsage', () => {
    const categoryId = 'category-123';

    it('should return category usage information', async () => {
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
      };

      const mockProducts = [
        { id: 'p1', name: 'Product 1', sku: 'SKU1' },
        { id: 'p2', name: 'Product 2', sku: 'SKU2' },
      ];

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      productRepository.find.mockResolvedValue(mockProducts);
      categoryRepository.count.mockResolvedValue(2);
      categoryMapper.mapToResponseDto.mockReturnValue(mockCategory);

      const result = await service.getCategoryUsage(categoryId);

      expect(result.category).toEqual(mockCategory);
      expect(result.productsCount).toBe(2);
      expect(result.products).toHaveLength(2);
      expect(result.childrenCount).toBe(2);
    });

    it('should throw error if category not found', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.getCategoryUsage(categoryId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateImage', () => {
    const categoryId = 'category-123';
    const imageUrl = 'https://example.com/image.jpg';

    it('should update category image successfully', async () => {
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
        image: null,
      };

      const updatedCategory = {
        ...mockCategory,
        image: imageUrl,
      };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      categoryRepository.save.mockResolvedValue(updatedCategory);
      categoryMapper.mapToResponseDto.mockReturnValue(updatedCategory);

      const result = await service.updateImage(categoryId, imageUrl);

      expect(categoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          image: imageUrl,
        })
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should delete old image if exists', async () => {
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
        image: 'https://example.com/old-image.jpg',
      };

      const updatedCategory = {
        ...mockCategory,
        image: imageUrl,
      };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      unifiedUploadService.deleteFilesByUrls.mockResolvedValue(undefined);
      categoryRepository.save.mockResolvedValue(updatedCategory);
      categoryMapper.mapToResponseDto.mockReturnValue(updatedCategory);

      await service.updateImage(categoryId, imageUrl);

      expect(unifiedUploadService.deleteFilesByUrls).toHaveBeenCalledWith(['https://example.com/old-image.jpg']);
    });

    it('should throw error if category not found', async () => {
      categoryRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Category not found');

      await expect(service.updateImage(categoryId, imageUrl)).rejects.toThrow(NotFoundException);
    });
  });
});
