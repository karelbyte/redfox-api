import { IsOptional, IsString, Length, IsEmail } from 'class-validator';

export class UpdateClientDto {
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
  @Length(3, 255)
  description?: string;

  @IsString()
  @IsOptional()
  @Length(3, 200)
  address?: string;

  @IsString()
  @IsOptional()
  @Length(3, 20)
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  @Length(3, 100)
  email?: string;

  @IsOptional()
  status?: boolean;
} 