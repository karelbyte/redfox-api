import { IsEnum, IsUUID, IsString, IsOptional, IsObject } from 'class-validator';
import { AttributionType } from '../../models/user-attribution.entity';

export class CreateUserAttributionDto {
  @IsUUID()
  userId: string;

  @IsEnum(AttributionType)
  attributionType: AttributionType;

  @IsUUID()
  resourceId: string;

  @IsString()
  resourceType: string;

  @IsObject()
  @IsOptional()
  permissions?: Record<string, boolean>;
}
