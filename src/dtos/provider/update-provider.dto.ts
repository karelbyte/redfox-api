import { IsString, IsEmail, IsOptional, Length, IsBoolean } from 'class-validator';

export class UpdateProviderDto {
  @IsString()
  @Length(3, 50)
  @IsOptional()
  code?: string;

  @IsString()
  @Length(3, 255)
  @IsOptional()
  description?: string;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string;

  @IsString()
  @Length(1, 20)
  @IsOptional()
  document?: string;

  @IsString()
  @Length(1, 20)
  @IsOptional()
  phone?: string;

  @IsEmail()
  @Length(1, 100)
  @IsOptional()
  email?: string;

  @IsString()
  @Length(1, 200)
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
} 