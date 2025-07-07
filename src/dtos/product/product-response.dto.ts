import { Expose, Transform } from 'class-transformer';
import { BrandResponseDto } from '../brand/brand-response.dto';
import { CategoryResponseDto } from '../category/category-response.dto';
import { TaxResponseDto } from '../tax/tax-response.dto';
import { MeasurementUnitResponseDto } from '../measurement-unit/measurement-unit-response.dto';
import { ProductType } from '../../models/product.entity';

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
  brand?: BrandResponseDto | null;

  @Expose()
  category?: CategoryResponseDto | null;

  @Expose()
  tax?: TaxResponseDto | null;

  @Expose()
  measurement_unit?: MeasurementUnitResponseDto | null;

  @Expose()
  is_active: boolean;

  @Expose()
  type: ProductType;

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
}
