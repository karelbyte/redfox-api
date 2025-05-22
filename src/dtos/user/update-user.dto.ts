import { IsString, IsEmail, IsArray, IsOptional, IsUUID, MinLength, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  role_ids?: string[];

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}