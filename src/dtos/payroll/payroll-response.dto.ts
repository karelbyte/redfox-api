import { Payroll, PayrollStatus } from '../../models/payroll.entity';

export class PayrollResponseDto {
  id: string;
  employee_id: string;
  period_start: Date;
  period_end: Date;
  base_salary: number;
  overtime_pay: number;
  bonuses: number;
  deductions: number;
  net_pay: number;
  status: PayrollStatus;
  notes: string;
  processed_at: Date;
  created_at: Date;
  updated_at: Date;

  static fromEntity(entity: Payroll): PayrollResponseDto {
    const dto = new PayrollResponseDto();
    dto.id = entity.id;
    dto.employee_id = entity.employee_id;
    dto.period_start = entity.period_start;
    dto.period_end = entity.period_end;
    dto.base_salary = Number(entity.base_salary);
    dto.overtime_pay = Number(entity.overtime_pay);
    dto.bonuses = Number(entity.bonuses);
    dto.deductions = Number(entity.deductions);
    dto.net_pay = Number(entity.net_pay);
    dto.status = entity.status;
    dto.notes = entity.notes;
    dto.processed_at = entity.processed_at;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;
    return dto;
  }
}
