import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Length,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCashRegisterDto {
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
  description?: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  initial_amount: number;
}
