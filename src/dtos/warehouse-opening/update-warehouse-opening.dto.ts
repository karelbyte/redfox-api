import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class UpdateWarehouseOpeningDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;
}
