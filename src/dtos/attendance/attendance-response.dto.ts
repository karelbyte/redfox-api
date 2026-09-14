import { Attendance } from '../../models/attendance.entity';

export class AttendanceResponseDto {
  id: string;
  employee_id: string;
  date: Date;
  check_in: Date;
  check_out: Date;
  work_hours: number;
  overtime_hours: number;
  status: string;
  notes: string;
  created_at: Date;
  updated_at: Date;

  static fromEntity(entity: Attendance): AttendanceResponseDto {
    const dto = new AttendanceResponseDto();
    dto.id = entity.id;
    dto.employee_id = entity.employee_id;
    dto.date = entity.date;
    dto.check_in = entity.check_in;
    dto.check_out = entity.check_out;
    dto.work_hours = entity.work_hours;
    dto.overtime_hours = entity.overtime_hours;
    dto.status = entity.status;
    dto.notes = entity.notes;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;
    return dto;
  }
}
