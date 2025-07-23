import { IsOptional, IsUUID } from 'class-validator';

export class PurchaseOrderDetailQueryDto {
  @IsOptional()
  @IsUUID()
  product_id?: string;
} 