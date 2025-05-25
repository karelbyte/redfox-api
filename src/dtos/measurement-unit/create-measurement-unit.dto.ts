import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateMeasurementUnitDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  description: string;

  @IsOptional()
  status?: boolean;
}
