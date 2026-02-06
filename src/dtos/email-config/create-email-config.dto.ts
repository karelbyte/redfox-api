import { IsString, IsNumber, IsEmail, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateEmailConfigDto {
  @IsString()
  host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  user: string;

  @IsString()
  password: string;

  @IsEmail()
  fromEmail: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;
}
