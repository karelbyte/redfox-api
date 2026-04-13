import { IsNotEmpty, IsString, IsUUID, IsOptional, IsNumber, IsDateString, MaxLength } from 'class-validator';

export class CreateShipmentDto {
  @IsOptional()
  @IsUUID()
  withdrawal_id?: string;

  @IsOptional()
  @IsUUID()
  shipping_address_id?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  carrier: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tracking_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tracking_url?: string;

  @IsOptional()
  @IsNumber()
  shipping_cost?: number;

  @IsOptional()
  @IsDateString()
  estimated_delivery_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
