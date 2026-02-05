import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateQuotationDetailDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_percentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_amount?: number;
}