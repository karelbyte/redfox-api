import { Injectable } from '@nestjs/common';
import { Category } from '../../models/category.entity';
import { CategoryResponseDto } from '../../dtos/category/category-response.dto';

@Injectable()
export class CategoryMapper {
  mapToResponseDto(category: Category): CategoryResponseDto {
    if (!category) {
      throw new Error('Category cannot be null');
    }

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
      children: children?.map((child) => this.mapToResponseDto(child)),
    };
  }
}
