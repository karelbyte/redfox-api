import { IsUUID, IsOptional } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class ReceptionDetailQueryDto extends PaginationDto {
  @IsUUID()
  @IsOptional()
  reception_id?: string;
} 