import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, PaymentMethod } from '../../models/invoice.entity';

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

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @IsDateString()
  date: string;

  @IsUUID()
  @IsNotEmpty()
  client_id: string;

  @IsUUID()
  @IsOptional()
  withdrawal_id?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @IsString()
  @IsOptional()
  @Length(3, 100)
  payment_conditions?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceDetailDto)
  details: CreateInvoiceDetailDto[];
}
