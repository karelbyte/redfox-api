import { IsOptional, IsEnum, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { CashTransactionType, PaymentMethod } from '../../models/cash-transaction.entity';

export class UpdateCashTransactionDto {
  @IsOptional()
  @IsEnum(CashTransactionType)
  type?: CashTransactionType;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsUUID()
  sale_id?: string;
} 