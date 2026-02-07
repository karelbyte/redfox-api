import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  entityType: string;

  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
