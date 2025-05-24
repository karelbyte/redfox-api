import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { TaxType } from '../../models/tax.entity';

export class CreateTaxDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  value: number;

  @IsEnum(TaxType)
  type: TaxType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
