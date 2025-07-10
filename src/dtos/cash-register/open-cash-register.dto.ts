import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Length,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class OpenCashRegisterDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  initial_amount: number;

  @IsString()
  @IsOptional()
  @Length(3, 100)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
