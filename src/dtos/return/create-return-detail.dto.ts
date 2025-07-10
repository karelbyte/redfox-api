import {
  IsUUID,
  IsPositive,
  IsNumber,
} from 'class-validator';

export class CreateReturnDetailDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;
} 