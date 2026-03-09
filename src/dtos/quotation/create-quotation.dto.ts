import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateQuotationDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsDateString()
  date: string;

  @IsDateString()
  @IsOptional()
  valid_until?: string;

  @IsUUID()
  client_id: string;

  @IsUUID()
  warehouse_id: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
