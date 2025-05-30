import { Expose, Transform } from 'class-transformer';
import { BrandResponseDto } from '../brand/brand-response.dto';
import { CategoryResponseDto } from '../category/category-response.dto';
import { TaxResponseDto } from '../tax/tax-response.dto';
import { MeasurementUnitResponseDto } from '../measurement-unit/measurement-unit-response.dto';

export class ProductResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string;

  @Expose()
  sku: string;

  @Expose()
  weight: number;

  @Expose()
  width: number;

  @Expose()
  height: number;

  @Expose()
  length: number;

  @Expose()
  brand: BrandResponseDto;

  @Expose()
  category: CategoryResponseDto;

  @Expose()
  tax: TaxResponseDto;

  @Expose()
  measurement_unit: MeasurementUnitResponseDto;

  @Expose()
  is_active: boolean;

  @Expose()
  is_featured: boolean;

  @Expose()
  is_digital: boolean;

  @Expose()
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  })
  images: string[];

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}
