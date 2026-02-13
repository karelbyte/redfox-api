import { Expose, Transform, Type } from 'class-transformer';
import { BrandResponseDto } from '../brand/brand-response.dto';
import { CategoryResponseDto } from '../category/category-response.dto';
import { TaxResponseDto } from '../tax/tax-response.dto';
import { MeasurementUnitResponseDto } from '../measurement-unit/measurement-unit-response.dto';
import { ProductType, InventoryStrategy } from '../../models/product.entity';
import { ProductPriceResponseDto } from './product-price.dto';

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
  code: string;

  @Expose()
  barcode?: string;

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
  inventory_strategy: InventoryStrategy;

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
  base_price: number;

  @Expose()
  @Type(() => ProductPriceResponseDto)
  prices: ProductPriceResponseDto[];

  @Expose()
  created_at: Date;
}
