import { Injectable } from '@nestjs/common';
import { Category } from '../../models/category.entity';
import { CategoryResponseDto } from '../../dtos/category/category-response.dto';

@Injectable()
export class CategoryMapper {
  mapToResponseDto(category: Category): CategoryResponseDto {
    const {
      id,
      name,
      slug,
      description,
      image,
      parentId,
      position,
      isActive,
      createdAt,
    } = category;
    return {
      id,
      name,
      slug,
      description,
      image,
      parentId,
      position,
      isActive,
      createdAt,
    };
  }
}
