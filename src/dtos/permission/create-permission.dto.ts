import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  module: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  code: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  description: string;
}
