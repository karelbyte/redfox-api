import { IsUUID, IsNumber, Min, IsOptional } from 'class-validator';

export class CreatePurchaseOrderDetailDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsUUID()
  @IsOptional()
  warehouse_id?: string;
}
