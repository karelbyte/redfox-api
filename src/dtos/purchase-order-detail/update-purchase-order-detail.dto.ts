import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDetailDto } from './create-purchase-order-detail.dto';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdatePurchaseOrderDetailDto extends PartialType(CreatePurchaseOrderDetailDto) {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  received_quantity?: number;
} 