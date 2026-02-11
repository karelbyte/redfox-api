import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProviderAddressDto } from './create-provider-address.dto';
import { CreateProviderTaxDataDto } from './create-provider-tax-data.dto';

export class CreateProviderDto {
  @IsString()
  @Length(3, 50)
  code: string;

  @IsString()
  @Length(3, 255)
  description: string;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string;

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
  @Type(() => CreateProviderAddressDto)
  addresses?: CreateProviderAddressDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProviderTaxDataDto)
  taxData?: CreateProviderTaxDataDto[];

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
