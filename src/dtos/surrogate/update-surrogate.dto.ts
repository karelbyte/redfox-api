import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateSurrogateDto {
  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  suffix?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  next_number?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  padding?: number;

  @IsOptional()
  @IsBoolean()
  include_year?: boolean;

  @IsOptional()
  @IsString()
  year_separator?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}