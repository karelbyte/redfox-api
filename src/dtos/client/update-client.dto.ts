import {
  IsOptional,
  IsString,
  Length,
  IsEmail,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateClientAddressDto } from './update-client-address.dto';
import { UpdateClientTaxDataDto } from './update-client-tax-data.dto';
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
  @ValidateIf((o) => o.phone && o.phone.length > 0)
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
  @Type(() => UpdateClientAddressDto)
  addresses?: UpdateClientAddressDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateClientTaxDataDto)
  taxData?: UpdateClientTaxDataDto[];

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
