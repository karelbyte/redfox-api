import { Employee } from '../../models/employee.entity';

export class EmployeeResponseDto {
  id: string;
  organization_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: Date;
  gender?: string;
  address?: string;
  department_id?: string;
  position_id?: string;
  manager_id?: string;
  hire_date: Date;
  termination_date?: Date;
  salary: number;
  status: string;
  is_active: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  user_id?: string;
  created_at: Date;
  updated_at: Date;

  static fromEntity(employee: Employee): EmployeeResponseDto {
    const response = new EmployeeResponseDto();
    response.id = employee.id;
    response.organization_id = employee.organization_id;
    response.employee_code = employee.employee_code;
    response.first_name = employee.first_name;
    response.last_name = employee.last_name;
    response.email = employee.email;
    response.phone = employee.phone;
    response.birth_date = employee.birth_date;
    response.gender = employee.gender;
    response.address = employee.address;
    response.department_id = employee.department_id;
    response.position_id = employee.position_id;
    response.manager_id = employee.manager_id;
    response.hire_date = employee.hire_date;
    response.termination_date = employee.termination_date;
    response.salary = employee.salary;
    response.status = employee.status;
    response.is_active = employee.is_active;
    response.emergency_contact_name = employee.emergency_contact_name;
    response.emergency_contact_phone = employee.emergency_contact_phone;
    response.emergency_contact_relation = employee.emergency_contact_relation;
    response.user_id = employee.user_id;
    response.created_at = employee.created_at;
    response.updated_at = employee.updated_at;
    return response;
  }
}
