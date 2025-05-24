import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { TaxType } from '../../models/tax.entity';

export class UpdateTaxDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @IsEnum(TaxType)
  @IsOptional()
  type?: TaxType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
