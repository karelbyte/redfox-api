import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsBoolean,
} from 'class-validator';

export class CreateClientTaxDataDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  tax_document: string;

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
