import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProviderDto {
  @IsString()
  @IsOptional()
  @Length(3, 50)
  code?: string;

  @IsString()
  @IsOptional()
  @Length(3, 255)
  description?: string;

  @IsOptional()
  status?: boolean;
} 