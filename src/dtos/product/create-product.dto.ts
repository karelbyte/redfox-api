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
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { ProductType } from '../../models/product.entity';

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
}: TransformFnParams): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
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

  @IsUUID()
  measurement_unit_id: string;

  @IsBoolean()
  @IsOptional()
  @Transform(transformToBoolean)
  is_active?: boolean;

  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  @Transform(transformToArray)
  images?: string[];
}
