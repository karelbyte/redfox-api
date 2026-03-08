import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { PaymentMethod } from '../../models/account-receivable-payment.entity';

export class CreateAccountPayablePaymentDto {
    @IsNotEmpty()
    @IsNumber()
    accountPayableId: number;

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    @IsDateString()
    paymentDate: string;

    @IsNotEmpty()
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsOptional()
    @IsString()
    reference?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
