import { IsString, IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateWarehouseAdjustmentDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsUUID()
  sourceWarehouseId: string;

  @IsUUID()
  targetWarehouseId: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  description?: string;
}
