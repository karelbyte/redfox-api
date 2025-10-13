import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateInvoiceDetailDto {
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax_rate?: number;
}

export class UpdateInvoiceDetailDto {
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax_rate?: number;
}

export class InvoiceDetailQueryDto {
  @IsUUID()
  @IsOptional()
  product_id?: string;
}
