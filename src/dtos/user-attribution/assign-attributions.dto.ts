import { IsArray, IsUUID, IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { AttributionType } from '../../models/user-attribution.entity';

export class AssignAttributionsDto {
  @IsUUID()
  userId: string;

  @IsEnum(AttributionType)
  attributionType: AttributionType;

  @IsArray()
  @IsUUID('4', { each: true })
  resourceIds: string[];

  @IsString()
  resourceType: string;

  @IsObject()
  @IsOptional()
  permissions?: Record<string, boolean>;
}
