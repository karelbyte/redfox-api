import { Position } from '../../models/position.entity';

export class PositionResponseDto {
  id: string;
  title: string;
  description: string;
  min_salary: number;
  max_salary: number;
  department_id: string;
  created_at: Date;
  updated_at: Date;
  employee_count: number;

  static fromEntity(entity: Position): PositionResponseDto {
    const dto = new PositionResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.min_salary = entity.min_salary;
    dto.max_salary = entity.max_salary;
    dto.department_id = entity.department_id;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;
    dto.employee_count = (entity as any).employee_count || 0;
    return dto;
  }
}
