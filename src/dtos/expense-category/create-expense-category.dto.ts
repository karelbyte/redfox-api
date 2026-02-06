import { IsString, IsOptional, IsBoolean, Length, Matches } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color' })
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}