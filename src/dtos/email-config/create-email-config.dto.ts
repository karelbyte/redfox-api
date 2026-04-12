import {
  IsString,
  IsNumber,
  IsEmail,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateEmailConfigDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEmail()
  fromEmail: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;
}
