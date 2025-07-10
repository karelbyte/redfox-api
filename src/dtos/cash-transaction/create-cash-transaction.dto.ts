import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Length,
  Min,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CashTransactionType, PaymentMethod } from '../../models/cash-transaction.entity';

export class CreateCashTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  cash_register_id: string;

  @IsEnum(CashTransactionType)
  @IsNotEmpty()
  type: CashTransactionType;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  description: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  reference: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  payment_method: PaymentMethod;

  @IsUUID()
  @IsOptional()
  sale_id?: string;
} 