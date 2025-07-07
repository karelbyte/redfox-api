import {
  IsOptional,
  IsPositive,
  IsNumber,
} from 'class-validator';

export class UpdateWarehouseAdjustmentDetailDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;
} 