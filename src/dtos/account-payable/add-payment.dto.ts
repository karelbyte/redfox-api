import {
    IsNumber,
    IsDateString,
    IsOptional,
    IsEnum,
    IsPositive,
    IsString,
    Length,
} from 'class-validator';
import { PaymentMethod } from '../../models/account-receivable-payment.entity';

export class AddAccountPayablePaymentDto {
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
