import {
  IsString,
  IsOptional,
  Length,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { IsValidRFC } from '../../validators/rfc.validator';

export class UpdateProviderTaxDataDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  @IsValidRFC()
  tax_document?: string;

  @IsString()
  @IsOptional()
  @Length(0, 10)
  tax_system?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  tax_name?: string;

  @IsString()
  @IsOptional()
  @Length(0, 10)
  default_invoice_use?: string;

  @IsBoolean()
  @IsOptional()
  is_main?: boolean;
}