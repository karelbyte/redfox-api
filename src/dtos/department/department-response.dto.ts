import { Department } from '../../models/department.entity';

export class DepartmentResponseDto {
  id: string;
  name: string;
  description: string;
  manager_id: string;
  created_at: Date;
  updated_at: Date;
  employee_count: number;

  static fromEntity(entity: Department): DepartmentResponseDto {
    const dto = new DepartmentResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.manager_id = entity.manager_id;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;
    dto.employee_count = (entity as any).employee_count || 0;
    return dto;
  }
}
