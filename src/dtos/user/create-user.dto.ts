import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  role_ids?: string[];
}
