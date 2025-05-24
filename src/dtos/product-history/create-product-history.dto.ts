import { IsNotEmpty, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { OperationType } from '../../models/product-history.entity';

export class CreateProductHistoryDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  warehouse_id: string;

  @IsEnum(OperationType)
  @IsNotEmpty()
  operation_type: OperationType;

  @IsString()
  @IsNotEmpty()
  operation_id: string;

  @IsNumber()
  @Min(0)
  quantity: number;
} 