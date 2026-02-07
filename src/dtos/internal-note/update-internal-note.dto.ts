import { IsString, IsOptional } from 'class-validator';

export class UpdateInternalNoteDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  color?: string;
}
