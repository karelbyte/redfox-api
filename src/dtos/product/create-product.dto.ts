import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  MinLength,
  Min,
  IsUrl,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import {
  Type,
  Transform,
  TransformFnParams,
  plainToInstance,
} from 'class-transformer';
import { ProductType, InventoryStrategy } from '../../models/product.entity';
import { ProductPriceDto } from './product-price.dto';

const transformToNumber = ({
  value,
}: TransformFnParams): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
};

const transformToBoolean = ({
  value,
}: TransformFnParams): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return value.toLowerCase() === 'true';
};

const transformToArray = ({
  value,
  key,
}: TransformFnParams): any[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (key === 'prices') {
        const instances = plainToInstance(
          ProductPriceDto,
          parsed,
        ) as unknown as any[];
        return instances;
      }
      return parsed;
    } catch (error) {
      return [value];
    }
  }
  return undefined;
};

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(3)
  slug: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsString()
  @MinLength(3)
  sku: string;

  @IsString()
  @MinLength(8)
  code: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(transformToNumber)
  weight?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(transformToNumber)
  width?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(transformToNumber)
  height?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(transformToNumber)
  length?: number;

  @IsUUID()
  @IsOptional()
  brand_id?: string;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsUUID()
  @IsOptional()
  tax_id?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  @Transform(transformToArray)
  tax_ids?: string[];

  @IsUUID()
  measurement_unit_id: string;

  @IsBoolean()
  @IsOptional()
  @Transform(transformToBoolean)
  is_active?: boolean;

  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @IsEnum(InventoryStrategy)
  @IsOptional()
  inventory_strategy?: InventoryStrategy;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(transformToArray)
  images?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(transformToNumber)
  base_price?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceDto)
  @IsOptional()
  @Transform(transformToArray)
  prices?: ProductPriceDto[];
}
