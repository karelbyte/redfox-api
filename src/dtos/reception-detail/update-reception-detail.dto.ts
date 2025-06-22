import { IsUUID, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateReceptionDetailDto {
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
}
