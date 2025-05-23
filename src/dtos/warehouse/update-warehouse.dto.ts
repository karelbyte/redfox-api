import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  code?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  address?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  phone?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
} 