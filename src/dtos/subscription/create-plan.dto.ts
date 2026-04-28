import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  version: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  billing_period: string;

  @IsString()
  @IsOptional()
  stripe_product_id?: string;

  @IsString()
  @IsOptional()
  stripe_price_id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  referrer_code?: string;
}
