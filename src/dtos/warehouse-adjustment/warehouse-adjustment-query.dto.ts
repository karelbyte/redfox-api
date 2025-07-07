import { IsOptional, IsUUID, IsDateString } from 'class-validator';

export class WarehouseAdjustmentQueryDto {
  @IsOptional()
  @IsUUID()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  targetWarehouseId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
