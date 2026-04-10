import { Expose, Transform, Type } from 'class-transformer';
import { BrandResponseDto } from '../brand/brand-response.dto';
import { CategoryResponseDto } from '../category/category-response.dto';
import { TaxResponseDto } from '../tax/tax-response.dto';
import { MeasurementUnitResponseDto } from '../measurement-unit/measurement-unit-response.dto';
import { ProductType, InventoryStrategy } from '../../models/product.entity';
import { ProductPriceResponseDto } from './product-price.dto';
import { CurrencyResponseDto } from '../currency/currency-response.dto';

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
  @Type(() => TaxResponseDto)
  taxes?: TaxResponseDto[];

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
      return JSON.parse(value as string) as string[];
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
  total_stock: number;

  @Expose()
  min_stock: number;

  @Expose()
  currency?: CurrencyResponseDto | null;

  @Expose()
  created_at: Date;

  @Expose()
  isSyncWithPack: boolean;
}
