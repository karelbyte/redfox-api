import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  tax_document: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  description: string;

  @IsString()
  @IsOptional()
  @Length(0, 200)
  address_street?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  address_exterior?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  address_interior?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  address_neighborhood?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  address_city?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  address_municipality?: string;

  @IsString()
  @IsOptional()
  @Length(0, 10)
  address_zip?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  address_state?: string;

  @IsString()
  @IsOptional()
  @Length(0, 3)
  address_country?: string;

  @IsString()
  @IsOptional()
  @Length(3, 20)
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  @Length(3, 100)
  email?: string;

  @IsString()
  @IsOptional()
  @Length(0, 10)
  tax_system?: string;

  @IsString()
  @IsOptional()
  @Length(0, 10)
  default_invoice_use?: string;
}
