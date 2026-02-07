import { IsString, IsOptional } from 'class-validator';

export class CreateBookmarkDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsOptional()
  @IsString()
  entityName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
