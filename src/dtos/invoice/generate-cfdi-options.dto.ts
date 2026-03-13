import { IsOptional, IsString, IsObject, IsEnum, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

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

/**
 * DTO para opciones de generación de CFDI con Factura Green
 * Soporta todos los casos especiales de emisión
 */
export class GenerateCFDIOptionsDto {
  @IsOptional()
  @IsEnum(['PUE', 'PPD'])
  paymentMethod?: 'PUE' | 'PPD';

  @IsOptional()
  @IsObject()
  itemDescriptions?: Record<string, string>;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => IEDUStudentDataDto)
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
