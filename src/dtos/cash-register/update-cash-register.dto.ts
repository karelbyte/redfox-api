import { IsOptional, IsString, IsNumber, Length, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCashRegisterDto {
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
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  current_amount?: number;
}
