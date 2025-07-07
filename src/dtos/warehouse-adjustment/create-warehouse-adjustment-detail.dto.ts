import {
  IsUUID,
  IsPositive,
  IsNumber,
} from 'class-validator';

export class CreateWarehouseAdjustmentDetailDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;
} 