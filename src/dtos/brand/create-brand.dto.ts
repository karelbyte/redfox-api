import { IsNotEmpty, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  description: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  @Length(3, 500)
  img?: string;
} 