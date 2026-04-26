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
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../../models/invoice.entity';

/**
 * DTO para datos de estudiante (productos IEDU - colegiaturas)
 */
export class IEDUStudentDataDto {
  @IsString()
  student_name: string;

  @IsString()
  student_popid: string; // CURP del estudiante
}

/**
 * DTO para dirección del emisor (sucursales)
 */
export class BusinessAddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsString()
  zip: string;
}

/**
 * DTO para complemento de donatarias
 */
export class DonatariasDataDto {
  @IsString()
  auth_number: string;

  @IsString()
  auth_date: string; // Formato: dd/mm/yyyy

  @IsOptional()
  @IsString()
  legend?: string;
}

/**
 * DTO para facturas globales
 */
export class GlobalInvoiceDataDto {
  @IsString()
  period: string; // '01' a '12'

  @IsString()
  periodicity: string; // '01' = Diario, '02' = Semanal, etc.

  @IsString()
  year: string; // '2024', '2025', etc.

  @IsOptional()
  @IsBoolean()
  enforceGlobal?: boolean;
}

export class GenerateCFDIDto {
  @IsString()
  @IsOptional()
  @Length(3, 255)
  notes?: string;

  // Opciones especiales para Factura Green
  @IsOptional()
  @IsEnum(['PUE', 'PPD'])
  paymentMethod?: 'PUE' | 'PPD';

  @IsOptional()
  @IsObject()
  itemPrices?: Record<string, number>;

  @IsOptional()
  @IsString()
  emitterId?: string;

  @IsOptional()
  @IsObject()
  itemDescriptions?: Record<string, string>;

  @IsOptional()
  @IsObject()
  itemDiscounts?: Record<string, number>;

  @IsOptional()
  @IsObject()
  ieduData?: Record<string, IEDUStudentDataDto>;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessAddressDto)
  businessAddress?: BusinessAddressDto;

  @IsOptional()
  @IsEnum(['-1d', '-2d', '-3d'])
  emmitDateOffset?: '-1d' | '-2d' | '-3d';

  @IsOptional()
  @IsString()
  paymentConditions?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DonatariasDataDto)
  donatarias?: DonatariasDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GlobalInvoiceDataDto)
  global?: GlobalInvoiceDataDto;
}

export class CancelCFDIDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
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
