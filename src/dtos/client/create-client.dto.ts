import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateClientAddressDto } from './create-client-address.dto';
import { CreateClientTaxDataDto } from './create-client-tax-data.dto';

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
  @IsOptional()
  @Length(0, 255)
  description: string;

  @IsString()
  @IsOptional()
  @Length(3, 20)
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  @Length(3, 100)
  email?: string;

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
}
