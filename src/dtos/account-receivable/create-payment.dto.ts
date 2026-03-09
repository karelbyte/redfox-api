import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
  IsPositive,
  IsString,
  Length,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '../../models/account-receivable-payment.entity';

export class CreateAccountReceivablePaymentDto {
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

  @IsUUID()
  accountReceivableId: string;
}
