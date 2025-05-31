import { IsNotEmpty, IsString, Length, IsOptional, IsEmail } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  tax_document: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  description: string;

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
} 