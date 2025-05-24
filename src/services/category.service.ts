import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from '../models/category.entity';
import { CreateCategoryDto } from '../dtos/category/create-category.dto';
import { UpdateCategoryDto } from '../dtos/category/update-category.dto';
import { CategoryResponseDto } from '../dtos/category/category-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  private mapToResponseDto(category: Category): CategoryResponseDto {
    const {
      id,
      name,
      slug,
      description,
      image,
      parentId,
      isActive,
      position,
      createdAt,
      updatedAt,
      children,
    } = category;
    return {
      id,
      name,
      slug,
      description,
      image,
      parentId,
      isActive,
      position,
      createdAt,
      updatedAt,
      children: children?.map((child) => this.mapToResponseDto(child)),
    };
  }

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = this.categoryRepository.create(createCategoryDto);
    const savedCategory = await this.categoryRepository.save(category);
    return this.mapToResponseDto(savedCategory);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [categories, total] = await this.categoryRepository.findAndCount({
      relations: ['children'],
      where: { parentId: IsNull() },
      withDeleted: false,
      skip,
      take: limit,
      order: {
        position: 'ASC',
        createdAt: 'DESC',
      },
    });

    const data = categories.map((category) => this.mapToResponseDto(category));

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

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
      withDeleted: false,
    });
    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }
    return this.mapToResponseDto(category);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
      withDeleted: false,
    });
    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    const updatedCategory = this.categoryRepository.create({
      ...category,
      ...updateCategoryDto,
    });
    const savedCategory = await this.categoryRepository.save(updatedCategory);
    return this.mapToResponseDto(savedCategory);
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
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
    return this.mapToResponseDto(category);
  }
}
