import { IsOptional, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class WarehouseAdjustmentDetailQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
} 