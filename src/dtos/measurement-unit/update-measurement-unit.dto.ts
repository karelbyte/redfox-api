import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateMeasurementUnitDto {
  @IsString()
  @IsOptional()
  @Length(2, 50)
  code?: string;

  @IsString()
  @IsOptional()
  @Length(2, 255)
  description?: string;

  @IsOptional()
  status?: boolean;
}
