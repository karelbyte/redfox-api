import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsUUID, IsEnum } from 'class-validator';
import { LeaveType, LeaveStatus } from '../../models/leave-request.entity';

export class CreateLeaveRequestDto {
  @IsUUID()
  @IsNotEmpty()
  employee_id: string;

  @IsEnum(LeaveType)
  @IsNotEmpty()
  leave_type: LeaveType;

  @IsDateString()
  @IsNotEmpty()
  start_date: Date;

  @IsDateString()
  @IsNotEmpty()
  end_date: Date;

  @IsNumber()
  @IsNotEmpty()
  days_count: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;
}
