import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateQuotationDetailDto {
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_percentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_amount?: number;
}