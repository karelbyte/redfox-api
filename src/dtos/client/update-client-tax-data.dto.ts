import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  IsBoolean,
} from 'class-validator';

export class UpdateClientTaxDataDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  tax_document?: string;

  @IsString()
  @IsOptional()
  @Length(1, 10)
  tax_system?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  tax_name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 10)
  default_invoice_use?: string;

  @IsBoolean()
  @IsOptional()
  is_main?: boolean;
}
