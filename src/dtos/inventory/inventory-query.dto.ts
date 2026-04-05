import { IsString, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class InventoryQueryDto extends PaginationDto {
  @IsString()
  @IsUUID()
  @IsOptional()
  warehouse_id?: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  product_id?: string;
}
