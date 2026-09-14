import {
  IsString,
  IsOptional,
  IsEmail,
  IsDate,
  IsNumber,
  IsEnum,
  Min,
  MaxLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(20)
  employee_code?: string;

  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  birth_date?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  gender?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  department_id?: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  position_id?: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  manager_id?: string;

  @IsDate()
  @Type(() => Date)
  hire_date: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  termination_date?: Date;

  @IsNumber()
  @Min(0)
  salary: number;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  emergency_contact_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  emergency_contact_phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  emergency_contact_relation?: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  user_id?: string;
}
