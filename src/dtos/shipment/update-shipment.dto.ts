import { IsEnum, IsOptional, IsString, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { ShipmentStatus } from '../../models/shipment.entity';

export class UpdateShipmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrier?: string;

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
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @IsDateString()
  estimated_delivery_date?: string;

  @IsOptional()
  @IsDateString()
  shipped_at?: string;

  @IsOptional()
  @IsDateString()
  delivered_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
