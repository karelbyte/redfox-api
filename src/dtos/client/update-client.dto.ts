import {
  IsOptional,
  IsString,
  Length,
  IsEmail,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateClientAddressDto } from './create-client-address.dto';
import { CreateClientTaxDataDto } from './create-client-tax-data.dto';
import { UpdateClientCreditDto } from './update-client-credit.dto';

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  @Length(3, 50)
  code?: string;

  @IsString()
  @IsOptional()
  @Length(3, 100)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  description?: string;

  @IsString()
  @IsOptional()
  @Length(3, 20)
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  @Length(3, 100)
  email?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateClientAddressDto)
  addresses?: CreateClientAddressDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateClientTaxDataDto)
  taxData?: CreateClientTaxDataDto[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  delete_addresses?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  delete_tax_data?: string[];

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClientCreditDto)
  credit?: UpdateClientCreditDto;
}
