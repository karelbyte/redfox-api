import { Injectable } from '@nestjs/common';
import { Product } from '../../models/product.entity';
import { ProductResponseDto } from '../../dtos/product/product-response.dto';
import { BrandMapper } from './brand.mapper';
import { CategoryMapper } from './category.mapper';
import { TaxMapper } from './tax.mapper';
import { MeasurementUnitMapper } from './measurement-unit.mapper';

@Injectable()
export class ProductMapper {
  constructor(
    private readonly brandMapper: BrandMapper,
    private readonly categoryMapper: CategoryMapper,
    private readonly taxMapper: TaxMapper,
    private readonly measurementUnitMapper: MeasurementUnitMapper,
  ) {}

  mapToResponseDto(product: Product): ProductResponseDto {
    if (!product) {
      throw new Error('Product cannot be null');
    }

    const {
      id,
      name,
      slug,
      description,
      sku,
      code,
      barcode,
      weight,
      width,
      height,
      length,
      brand,
      category,
      tax,
      measurement_unit,
      is_active,
      type,
      inventory_strategy,
      base_price,
      prices,
      images,
      total_stock,
      created_at,
    } = product;

    return {
      id,
      name,
      slug,
      description,
      sku,
      code,
      barcode,
      weight,
      width,
      height,
      length,
      brand: brand ? this.brandMapper.mapToResponseDto(brand) : null,
      category: category
        ? this.categoryMapper.mapToResponseDto(category)
        : null,
      tax: tax ? this.taxMapper.mapToResponseDto(tax) : null,
      measurement_unit: measurement_unit
        ? this.measurementUnitMapper.mapToResponseDto(measurement_unit)
        : null,
      is_active,
      type,
      inventory_strategy,
      base_price: Number(base_price),
      total_stock: Number(total_stock || 0),
      prices: prices
        ? prices.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
          }))
        : [],
      images: images ? (JSON.parse(images) as string[]) : [],
      created_at,
    };
  }
}
