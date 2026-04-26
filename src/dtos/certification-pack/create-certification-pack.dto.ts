import { IsEnum, IsOptional, IsBoolean, IsObject, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CertificationPackType } from '../../constants/certification-packs.constant';

export class CertificationPackEmitterDto {
  @IsString()
  emitter: string;

  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  fav?: boolean;

  @IsString()
  @IsOptional()
  status?: string;
}

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationPackEmitterDto)
  @IsOptional()
  emitters?: CertificationPackEmitterDto[];
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationPackEmitterDto)
  @IsOptional()
  emitters?: CertificationPackEmitterDto[];
}
