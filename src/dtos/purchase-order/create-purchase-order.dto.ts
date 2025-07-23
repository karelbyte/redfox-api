import { IsString, IsDate, IsUUID, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderDto {
  @IsString()
  code: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsUUID()
  provider_id: string;

  @IsUUID()
  warehouse_id: string;

  @IsString()
  document: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expected_delivery_date?: Date;

  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'])
  status?: string;
} 