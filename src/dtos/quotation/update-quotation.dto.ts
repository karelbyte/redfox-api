import { IsString, IsOptional, IsDateString, IsUUID, IsEnum } from 'class-validator';
import { QuotationStatus } from '../../models/quotation.entity';

export class UpdateQuotationDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  valid_until?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsUUID()
  @IsOptional()
  warehouse_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(QuotationStatus)
  @IsOptional()
  status?: QuotationStatus;
}