import { IsString, IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateReturnDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsUUID()
  sourceWarehouseId: string;

  @IsUUID()
  targetProviderId: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  description?: string;
} 