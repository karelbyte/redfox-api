import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateBrandDto {
  @IsString()
  @IsOptional()
  @Length(3, 50)
  code?: string;

  @IsString()
  @IsOptional()
  @Length(3, 255)
  description?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  @Length(3, 500)
  img?: string;

  @IsOptional()
  status?: boolean;
}
