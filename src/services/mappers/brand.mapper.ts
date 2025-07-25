import { Injectable } from '@nestjs/common';
import { Brand } from '../../models/brand.entity';
import { BrandResponseDto } from '../../dtos/brand/brand-response.dto';

@Injectable()
export class BrandMapper {
  mapToResponseDto(brand: Brand): BrandResponseDto {
    if (!brand) {
      throw new Error('Brand cannot be null');
    }

    const { id, code, description, img, isActive, created_at } = brand;
    return { id, code, description, img, isActive, created_at };
  }
}
