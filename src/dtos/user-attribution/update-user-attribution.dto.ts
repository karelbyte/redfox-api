import { IsEnum, IsUUID, IsString, IsOptional, IsObject } from 'class-validator';
import { AttributionType } from '../../models/user-attribution.entity';

export class UpdateUserAttributionDto {
  @IsEnum(AttributionType)
  @IsOptional()
  attributionType?: AttributionType;

  @IsUUID()
  @IsOptional()
  resourceId?: string;

  @IsString()
  @IsOptional()
  resourceType?: string;

  @IsObject()
  @IsOptional()
  permissions?: Record<string, boolean>;
}
