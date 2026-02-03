import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
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

export class CreateGlobalInvoiceDto {
  /** Fecha inicial del periodo (ISO date). Requerido si no se envía withdrawal_ids. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Fecha final del periodo (ISO date). Requerido si no se envía withdrawal_ids. */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Periodicidad en el PAC: day | week | fortnight | month | two_months */
  @IsString()
  @IsIn(['day', 'week', 'fortnight', 'month', 'two_months'])
  periodicity: string;

  /** IDs de ventas (withdrawals) a incluir. Si se envía, from y to deben coincidir con el periodo. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Type(() => String)
  withdrawal_ids?: string[];
}
