import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  IsBoolean,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProviderAddressDto } from './create-provider-address.dto';
import { CreateProviderTaxDataDto } from './create-provider-tax-data.dto';

export class CreateProviderDto {
  @IsString()
  @Length(3, 50)
  code: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  description?: string;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.phone && o.phone.length > 0)
  @Length(3, 20)
  phone?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.length > 0)
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
