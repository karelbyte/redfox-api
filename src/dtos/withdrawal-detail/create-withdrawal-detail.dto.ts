import { IsUUID, IsNumber, Min } from 'class-validator';

export class CreateWithdrawalDetailDto {
  @IsUUID()
  product_id: string;

  @IsUUID()
  warehouse_id: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
} 