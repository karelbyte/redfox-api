import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsUUID, MaxLength } from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  employee_id: string;

  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @IsDateString()
  @IsNotEmpty()
  check_in: Date;

  @IsDateString()
  @IsOptional()
  check_out?: Date;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  work_hours?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  overtime_hours?: number;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
