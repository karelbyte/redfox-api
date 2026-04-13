import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';
import { ShipmentStatus } from '../../models/shipment.entity';

export class ShipmentQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;
}
