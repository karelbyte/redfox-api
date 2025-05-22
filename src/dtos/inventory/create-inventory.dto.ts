import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  stock: number;
} 