import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  min_stock?: number;

  @IsUUID()
  @IsOptional()
  brand_id?: string;

  @IsUUID()
  @IsOptional()
  provider_id?: string;

  @IsUUID()
  @IsNotEmpty()
  measurement_unit_id: string;
} 