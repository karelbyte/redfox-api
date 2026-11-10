import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UPCDE_MAX_CONTENT_LENGTH } from '../../services/upcde.service';

export class CreateUpcdeRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(UPCDE_MAX_CONTENT_LENGTH)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  editorName?: string;
}

export class UpdateUpcdeRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(UPCDE_MAX_CONTENT_LENGTH)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  editorName?: string;
}
