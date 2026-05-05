import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsUUID, IsEnum } from 'class-validator';
import { PayrollStatus } from '../../models/payroll.entity';

export class CreatePayrollDto {
  @IsUUID()
  @IsNotEmpty()
  employee_id: string;

  @IsDateString()
  @IsNotEmpty()
  period_start: Date;

  @IsDateString()
  @IsNotEmpty()
  period_end: Date;

  @IsNumber()
  @IsNotEmpty()
  base_salary: number;

  @IsNumber()
  @IsOptional()
  overtime_pay?: number;

  @IsNumber()
  @IsOptional()
  bonuses?: number;

  @IsNumber()
  @IsOptional()
  deductions?: number;

  @IsNumber()
  @IsNotEmpty()
  net_pay: number;

  @IsEnum(PayrollStatus)
  @IsOptional()
  status?: PayrollStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
