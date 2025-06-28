import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource, Like, FindManyOptions } from 'typeorm';
import { Category } from '../models/category.entity';
import { Product } from '../models/product.entity';
import { CreateCategoryDto } from '../dtos/category/create-category.dto';
import { UpdateCategoryDto } from '../dtos/category/update-category.dto';
import { CategoryResponseDto } from '../dtos/category/category-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { CategoryMapper } from './mappers/category.mapper';
import { TranslationService } from './translation.service';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private dataSource: DataSource,
    private readonly categoryMapper: CategoryMapper,
    private readonly translationService: TranslationService,
  ) {}

  private async validateHierarchyCycle(
    categoryId: string,
    newParentId: string,
    userId?: string,
  ): Promise<void> {
    let currentParentId = newParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (currentParentId === categoryId) {
        const message = await this.translationService.translate(
          'category.hierarchy_cycle',
          userId,
        );
        throw new BadRequestException(message);
      }

      if (visited.has(currentParentId)) {
        const message = await this.translationService.translate(
          'category.hierarchy_cycle_detected',
          userId,
        );
        throw new BadRequestException(message);
      }

      visited.add(currentParentId);

      const parent = await this.categoryRepository.findOne({
        where: { id: currentParentId },
        select: ['id', 'parentId'],
      });

      if (!parent) {
        break;
      }

      currentParentId = parent.parentId;
    }
  }

  private async validateChildrenStatus(
    categoryId: string,
    newStatus: boolean,
    userId?: string,
  ): Promise<void> {
    if (!newStatus) {
      const hasActiveChildren = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.parentId = :categoryId', { categoryId })
        .andWhere('category.isActive = :isActive', { isActive: true })
        .getExists();

      if (hasActiveChildren) {
        const message = await this.translationService.translate(
          'category.cannot_deactivate_with_active_children',
          userId,
        );
        throw new BadRequestException(message);
      }
    }
  }

  private logCategoryChange(
    categoryId: string,
    oldData: Partial<Category>,
    newData: Partial<Category>,
  ): void {
    this.logger.log(
      `Category ${categoryId} updated: ${JSON.stringify({
        old: oldData,
        new: newData,
      })}`,
    );
  }

  async create(
    createCategoryDto: CreateCategoryDto,
    userId?: string,
  ): Promise<CategoryResponseDto> {
    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });

      if (!parentCategory) {
        const message = await this.translationService.translate(
          'category.parent_not_found',
          userId,
          { id: createCategoryDto.parentId },
        );
        throw new BadRequestException(message);
      }
    }

    const existingCategory = await this.categoryRepository.findOne({
      where: { slug: createCategoryDto.slug },
    });

    if (existingCategory) {
      const message = await this.translationService.translate(
        'category.already_exists',
        userId,
        { slug: createCategoryDto.slug },
      );
      throw new BadRequestException(message);
    }

    const category = this.categoryRepository.create(createCategoryDto);
    const savedCategory = await this.categoryRepository.save(category);
    return this.categoryMapper.mapToResponseDto(savedCategory);
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    const { page, limit, term } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions: FindManyOptions<Category> = {
      relations: ['children'],
      where: { parentId: IsNull() },
      withDeleted: false,
      order: {
        position: 'ASC' as const,
        createdAt: 'DESC' as const,
      },
    };

    const whereConditions: FindManyOptions<Category> = term
      ? {
          ...baseConditions,
          where: [
            { name: Like(`%${term}%`) },
            { slug: Like(`%${term}%`) },
            { description: Like(`%${term}%`) },
          ],
        }
      : baseConditions;

    if (!page && !limit) {
      const categories = await this.categoryRepository.find(whereConditions);

      const data = categories.map((category) =>
        this.categoryMapper.mapToResponseDto(category),
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

    const [categories, total] = await this.categoryRepository.findAndCount({
      ...whereConditions,
      skip,
      take: currentLimit,
    });

    const data = categories.map((category) =>
      this.categoryMapper.mapToResponseDto(category),
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
  }

  async findOne(id: string, userId?: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
      withDeleted: false,
    });
    if (!category) {
      const message = await this.translationService.translate(
        'category.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.categoryMapper.mapToResponseDto(category);
  }

  async update(
    id: string,
    updateCategoryDto: Partial<UpdateCategoryDto>,
    userId?: string,
  ): Promise<CategoryResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const category = await queryRunner.manager.findOne(Category, {
        where: { id },
        relations: ['children'],
        withDeleted: false,
      });

      if (!category) {
        const message = await this.translationService.translate(
          'category.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      if (updateCategoryDto.parentId) {
        if (updateCategoryDto.parentId === id) {
          const message = await this.translationService.translate(
            'category.cannot_be_own_parent',
            userId,
          );
          throw new BadRequestException(message);
        }

        const parentCategory = await queryRunner.manager.findOne(Category, {
          where: { id: updateCategoryDto.parentId },
        });

        if (!parentCategory) {
          const message = await this.translationService.translate(
            'category.parent_not_found',
            userId,
            { id: updateCategoryDto.parentId },
          );
          throw new BadRequestException(message);
        }

        await this.validateHierarchyCycle(
          id,
          updateCategoryDto.parentId,
          userId,
        );

        if (category.children && category.children.length > 0) {
          const message = await this.translationService.translate(
            'category.cannot_change_parent_with_children',
            userId,
          );
          throw new BadRequestException(message);
        }
      }

      if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
        const existingCategory = await queryRunner.manager.findOne(Category, {
          where: { slug: updateCategoryDto.slug },
        });

        if (existingCategory) {
          const message = await this.translationService.translate(
            'category.already_exists',
            userId,
            { slug: updateCategoryDto.slug },
          );
          throw new BadRequestException(message);
        }
      }

      if (updateCategoryDto.isActive !== undefined) {
        await this.validateChildrenStatus(
          id,
          updateCategoryDto.isActive,
          userId,
        );
      }

      const oldData = {
        parentId: category.parentId,
        slug: category.slug,
        isActive: category.isActive,
        name: category.name,
        description: category.description,
        position: category.position,
      };

      await queryRunner.manager.update(Category, id, updateCategoryDto);

      const updatedCategory = await queryRunner.manager.findOne(Category, {
        where: { id },
        relations: ['children'],
        withDeleted: false,
      });

      if (!updatedCategory) {
        const message = await this.translationService.translate(
          'category.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      this.logCategoryChange(id, oldData, updateCategoryDto);

      await queryRunner.commitTransaction();
      return this.categoryMapper.mapToResponseDto(updatedCategory);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!category) {
      const message = await this.translationService.translate(
        'category.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    const productsUsingCategory = await this.productRepository.count({
      where: { category: { id } },
      withDeleted: false,
    });

    if (productsUsingCategory > 0) {
      const message = await this.translationService.translate(
        'category.cannot_delete_in_use',
        userId,
        { name: category.name, count: productsUsingCategory },
      );
      throw new BadRequestException(message);
    }

    const hasChildren = await this.categoryRepository.count({
      where: { parentId: id },
      withDeleted: false,
    });

    if (hasChildren > 0) {
      const message = await this.translationService.translate(
        'category.cannot_delete_with_children',
        userId,
        { name: category.name, count: hasChildren },
      );
      throw new BadRequestException(message);
    }

    await this.categoryRepository.softRemove(category);
  }

  async findBySlug(
    slug: string,
    userId?: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['children'],
      withDeleted: false,
    });
    if (!category) {
      const message = await this.translationService.translate(
        'category.slug_not_found',
        userId,
        { slug },
      );
      throw new NotFoundException(message);
    }
    return this.categoryMapper.mapToResponseDto(category);
  }

  async findByParentId(
    parentId: string,
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // Verificar que el parent existe
    const parent = await this.categoryRepository.findOne({
      where: { id: parentId },
      withDeleted: false,
    });

    if (!parent) {
      const message = await this.translationService.translate(
        'category.parent_not_found',
        userId,
        { id: parentId },
      );
      throw new NotFoundException(message);
    }

    const [categories, total] = await this.categoryRepository.findAndCount({
      where: { parentId },
      relations: ['children'],
      withDeleted: false,
      skip,
      take: limit,
      order: {
        position: 'ASC',
        createdAt: 'DESC',
      },
    });

    const data = categories.map((category) =>
      this.categoryMapper.mapToResponseDto(category),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategoryUsage(id: string): Promise<{
    category: CategoryResponseDto;
    productsCount: number;
    products: any[];
    childrenCount: number;
  }> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    const products = await this.productRepository.find({
      where: { category: { id } },
      select: ['id', 'name', 'sku'],
      withDeleted: false,
    });

    const childrenCount = await this.categoryRepository.count({
      where: { parentId: id },
      withDeleted: false,
    });

    return {
      category: this.categoryMapper.mapToResponseDto(category),
      productsCount: products.length,
      products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
      childrenCount,
    };
  }
}
