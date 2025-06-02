import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateWarehouseOpeningDto {
  @IsNotEmpty()
  @IsUUID()
  warehouseId: string;

  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;
}
