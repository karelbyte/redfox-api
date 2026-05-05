import { LeaveRequest, LeaveType, LeaveStatus } from '../../models/leave-request.entity';

export class LeaveRequestResponseDto {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  days_count: number;
  status: LeaveStatus;
  reason: string;
  approved_by: string;
  approved_at: Date;
  created_at: Date;
  updated_at: Date;

  static fromEntity(entity: LeaveRequest): LeaveRequestResponseDto {
    const dto = new LeaveRequestResponseDto();
    dto.id = entity.id;
    dto.employee_id = entity.employee_id;
    dto.leave_type = entity.leave_type;
    dto.start_date = entity.start_date;
    dto.end_date = entity.end_date;
    dto.days_count = entity.days_count;
    dto.status = entity.status;
    dto.reason = entity.reason;
    dto.approved_by = entity.approved_by;
    dto.approved_at = entity.approved_at;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;
    return dto;
  }
}
