import { IsString, IsOptional } from 'class-validator';

export class CreateTagDto {
  @IsString()
  name: string;

  @IsString()
  entityType: string;

  @IsOptional()
  @IsString()
  color?: string;
}
