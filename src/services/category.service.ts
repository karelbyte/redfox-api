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
  ) {}

  private async validateHierarchyCycle(
    categoryId: string,
    newParentId: string,
  ): Promise<void> {
    let currentParentId = newParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (currentParentId === categoryId) {
        throw new BadRequestException(
          'No se puede crear un ciclo en la jerarquía de categorías',
        );
      }

      if (visited.has(currentParentId)) {
        throw new BadRequestException(
          'Se ha detectado un ciclo en la jerarquía de categorías',
        );
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
  ): Promise<void> {
    if (!newStatus) {
      const hasActiveChildren = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.parentId = :categoryId', { categoryId })
        .andWhere('category.isActive = :isActive', { isActive: true })
        .getExists();

      if (hasActiveChildren) {
        throw new BadRequestException(
          'No se puede desactivar una categoría que tiene hijos activos',
        );
      }
    }
  }

  private logCategoryChange(
    categoryId: string,
    oldData: Partial<Category>,
    newData: Partial<Category>,
  ): void {
    this.logger.log(
      `Categoría ${categoryId} actualizada: ${JSON.stringify({
        old: oldData,
        new: newData,
      })}`,
    );
  }

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new BadRequestException(
          `La categoría padre con ID ${createCategoryDto.parentId} no existe`,
        );
      }
    }

    const existingCategory = await this.categoryRepository.findOne({
      where: { slug: createCategoryDto.slug },
    });

    if (existingCategory) {
      throw new BadRequestException(
        `Ya existe una categoría con el slug '${createCategoryDto.slug}'`,
      );
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

    // Si no se proporciona paginación, devolver toda la data
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

    // Si se proporciona paginación, aplicar la lógica de paginación
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

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
      withDeleted: false,
    });
    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }
    return this.categoryMapper.mapToResponseDto(category);
  }

  async update(
    id: string,
    updateCategoryDto: Partial<UpdateCategoryDto>,
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
        throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
      }

      // 1. Validar parentId si se está actualizando
      if (updateCategoryDto.parentId) {
        // No permitir que una categoría sea su propia padre
        if (updateCategoryDto.parentId === id) {
          throw new BadRequestException(
            'Una categoría no puede ser su propia categoría padre',
          );
        }

        // Validar que la categoría padre exista
        const parentCategory = await queryRunner.manager.findOne(Category, {
          where: { id: updateCategoryDto.parentId },
        });

        if (!parentCategory) {
          throw new BadRequestException(
            `La categoría padre con ID ${updateCategoryDto.parentId} no existe`,
          );
        }

        // Validar ciclos en la jerarquía
        await this.validateHierarchyCycle(id, updateCategoryDto.parentId);

        // Validar que no se mueva una categoría con hijos
        if (category.children && category.children.length > 0) {
          throw new BadRequestException(
            'No se puede cambiar la categoría padre de una categoría que tiene hijos',
          );
        }
      }

      // 2. Validar slug si se está actualizando
      if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
        const existingCategory = await queryRunner.manager.findOne(Category, {
          where: { slug: updateCategoryDto.slug },
        });

        if (existingCategory) {
          throw new BadRequestException(
            `Ya existe una categoría con el slug '${updateCategoryDto.slug}'`,
          );
        }
      }

      // 3. Validar estado si se está actualizando
      if (updateCategoryDto.isActive !== undefined) {
        await this.validateChildrenStatus(id, updateCategoryDto.isActive);
      }

      // 4. Guardar los datos antiguos para el log
      const oldData = {
        parentId: category.parentId,
        slug: category.slug,
        isActive: category.isActive,
        name: category.name,
        description: category.description,
        position: category.position,
      };

      // 5. Actualizar la categoría
      await queryRunner.manager.update(Category, id, updateCategoryDto);

      // 6. Obtener la categoría actualizada
      const updatedCategory = await queryRunner.manager.findOne(Category, {
        where: { id },
        relations: ['children'],
        withDeleted: false,
      });

      if (!updatedCategory) {
        throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
      }

      // 7. Registrar el cambio
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

  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    // Verificar si la categoría está siendo usada en productos
    const productsUsingCategory = await this.productRepository.count({
      where: { category: { id } },
      withDeleted: false,
    });

    if (productsUsingCategory > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría '${category.name}' porque está siendo usada por ${productsUsingCategory} producto(s). Primero debe cambiar o eliminar los productos que usan esta categoría.`,
      );
    }

    // Verificar si tiene hijos
    const hasChildren = await this.categoryRepository.count({
      where: { parentId: id },
      withDeleted: false,
    });

    if (hasChildren > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría '${category.name}' porque tiene ${hasChildren} subcategoría(s). Primero debe eliminar o mover las subcategorías.`,
      );
    }

    await this.categoryRepository.softRemove(category);
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['children'],
      withDeleted: false,
    });
    if (!category) {
      throw new NotFoundException(`Categoría con slug ${slug} no encontrada`);
    }
    return this.categoryMapper.mapToResponseDto(category);
  }

  async findByParentId(
    parentId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // Verificar que el parent existe
    const parent = await this.categoryRepository.findOne({
      where: { id: parentId },
      withDeleted: false,
    });

    if (!parent) {
      throw new NotFoundException(
        `Categoría padre con ID ${parentId} no encontrada`,
      );
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
