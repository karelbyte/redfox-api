import { IsString, IsOptional } from 'class-validator';

export class CreateInternalNoteDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  color?: string;
}
