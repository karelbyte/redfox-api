import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
  IsPositive,
  Length,
  IsUUID,
} from 'class-validator';
import { AccountPayableStatus } from '../../models/account-payable.entity';

export class CreateAccountPayableDto {
  @IsString()
  @Length(1, 50)
  referenceNumber: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalAmount: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  remainingAmount: number;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsEnum(AccountPayableStatus)
  status?: AccountPayableStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsUUID()
  providerId: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;
}
