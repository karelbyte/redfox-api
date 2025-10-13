import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { InvoiceStatus } from '../../models/invoice.entity';

export class GenerateCFDIDto {
  @IsUUID()
  @IsNotEmpty()
  invoice_id: string;

  @IsString()
  @IsOptional()
  @Length(3, 255)
  notes?: string;
}

export class CancelCFDIDto {
  @IsUUID()
  @IsNotEmpty()
  invoice_id: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  reason: string;
}

export class ConvertWithdrawalToInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  withdrawal_id: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  invoice_code: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;
}
