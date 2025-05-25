import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from '../../src/services/category.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '../../src/models/category.entity';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CategoryService', () => {
  let service: CategoryService;
  let dataSource: DataSource;

  const mockCategoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn().mockImplementation(() => Promise.resolve(null)),
        update: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      const createCategoryDto = {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test Description',
        isActive: true,
      };

      const mockCategory = {
        id: '1',
        ...createCategoryDto,
        createdAt: new Date(),
      };

      mockCategoryRepository.create.mockReturnValue(mockCategory);
      mockCategoryRepository.save.mockResolvedValue(mockCategory);

      const result = await service.create(createCategoryDto);

      expect(result).toEqual(expect.objectContaining(createCategoryDto));
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(
        createCategoryDto,
      );
      expect(mockCategoryRepository.save).toHaveBeenCalled();
    });

    it('should throw error if parent category does not exist', async () => {
      const createCategoryDto = {
        name: 'Test Category',
        slug: 'test-category',
        parentId: 'non-existent-id',
      };

      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if slug already exists', async () => {
      const createCategoryDto = {
        name: 'Test Category',
        slug: 'existing-slug',
      };

      mockCategoryRepository.findOne.mockResolvedValue({
        id: '1',
        slug: 'existing-slug',
      });

      await expect(service.create(createCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Category 1',
          slug: 'category-1',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '2',
          name: 'Category 2',
          slug: 'category-2',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockCategoryRepository.findAndCount.mockResolvedValue([
        mockCategories,
        2,
      ]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      const mockCategory = {
        id: '1',
        name: 'Test Category',
        slug: 'test-category',
        isActive: true,
        createdAt: new Date(),
      };

      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne('1');

      expect(result).toEqual(expect.objectContaining(mockCategory));
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a category successfully', async () => {
      const updateCategoryDto = {
        name: 'Updated Category',
        slug: 'updated-category',
      };

      const mockCategory = {
        id: '1',
        name: 'Original Category',
        slug: 'original-category',
        isActive: true,
        createdAt: new Date(),
      };

      const mockUpdatedCategory = {
        ...mockCategory,
        ...updateCategoryDto,
      };

      const queryRunner = dataSource.createQueryRunner();
      const findOneMock = jest
        .fn()
        .mockImplementationOnce(() => Promise.resolve(mockCategory))
        .mockImplementationOnce(() => Promise.resolve(null))
        .mockImplementationOnce(() => Promise.resolve(mockUpdatedCategory));

      queryRunner.manager.findOne = findOneMock;

      const result = await service.update('1', updateCategoryDto);

      expect(result).toEqual(expect.objectContaining(updateCategoryDto));
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Category,
        '1',
        updateCategoryDto,
      );
    });

    it('should throw NotFoundException if category does not exist', async () => {
      const queryRunner = dataSource.createQueryRunner();
      queryRunner.manager.findOne = jest
        .fn()
        .mockImplementation(() => Promise.resolve(null));

      await expect(
        service.update('non-existent-id', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if trying to set category as its own parent', async () => {
      const mockCategory = {
        id: '1',
        name: 'Test Category',
        slug: 'test-category',
        isActive: true,
      };

      const queryRunner = dataSource.createQueryRunner();
      queryRunner.manager.findOne = jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockCategory));

      await expect(service.update('1', { parentId: '1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a category successfully', async () => {
      const mockCategory = {
        id: '1',
        name: 'Test Category',
        slug: 'test-category',
      };

      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockCategoryRepository.softRemove.mockResolvedValue(mockCategory);

      await service.remove('1');

      expect(mockCategoryRepository.softRemove).toHaveBeenCalledWith(
        mockCategory,
      );
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a category by slug', async () => {
      const mockCategory = {
        id: '1',
        name: 'Test Category',
        slug: 'test-category',
        isActive: true,
        createdAt: new Date(),
      };

      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findBySlug('test-category');

      expect(result).toEqual(expect.objectContaining(mockCategory));
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByParentId', () => {
    it('should return categories by parent id', async () => {
      const mockParent = {
        id: '1',
        name: 'Parent Category',
        slug: 'parent-category',
      };

      const mockCategories = [
        {
          id: '2',
          name: 'Child Category 1',
          slug: 'child-category-1',
          parentId: '1',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '3',
          name: 'Child Category 2',
          slug: 'child-category-2',
          parentId: '1',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockCategoryRepository.findOne.mockResolvedValueOnce(mockParent);
      mockCategoryRepository.findAndCount.mockResolvedValue([mockCategories, 2]);

      const result = await service.findByParentId('1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.data[0].parentId).toBe('1');
      expect(result.data[1].parentId).toBe('1');
    });

    it('should throw NotFoundException if parent category does not exist', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByParentId('non-existent-id', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
