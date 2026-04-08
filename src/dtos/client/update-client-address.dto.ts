import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateClientAddressDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  street?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  exterior_number?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  interior_number?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  neighborhood?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  municipality?: string;

  @IsString()
  @IsOptional()
  @Length(0, 10)
  zip_code?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  state?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  country?: string;

  @IsOptional()
  is_main?: boolean;
}
