import {
  IsUUID,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsPositive,
  Length,
} from 'class-validator';
import { PaymentMethod } from '../../models/expense-payment.entity';

export class CreateExpensePaymentDto {
  @IsOptional()
  @IsUUID()
  expenseId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
