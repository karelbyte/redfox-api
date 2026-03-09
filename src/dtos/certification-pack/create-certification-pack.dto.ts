import { IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { CertificationPackType } from '../../constants/certification-packs.constant';

export class CreateCertificationPackDto {
  @IsEnum(CertificationPackType)
  type: CertificationPackType;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}

export class UpdateCertificationPackDto {
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}
