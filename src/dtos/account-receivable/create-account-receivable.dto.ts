import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsPositive, Length } from 'class-validator';
import { AccountReceivableStatus } from '../../models/account-receivable.entity';

export class CreateAccountReceivableDto {
  @IsString()
  @Length(1, 50)
  referenceNumber: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalAmount: number;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsEnum(AccountReceivableStatus)
  status?: AccountReceivableStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;
}