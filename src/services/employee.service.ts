import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../models/employee.entity';
import { CreateEmployeeDto } from '../dtos/employee/create-employee.dto';
import { UpdateEmployeeDto } from '../dtos/employee/update-employee.dto';
import { EmployeeResponseDto } from '../dtos/employee/employee-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  async create(createEmployeeDto: CreateEmployeeDto, userId: string): Promise<EmployeeResponseDto> {
    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      organization_id: this.organizationId,
    });
    const savedEmployee = await this.employeeRepository.save(employee);
    return EmployeeResponseDto.fromEntity(savedEmployee);
  }

  async findAll(filter: PaginationDto): Promise<PaginatedResponse<EmployeeResponseDto>> {
    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.position', 'position')
      .leftJoinAndSelect('employee.manager', 'manager')
      .where('employee.organization_id = :orgId', { orgId: this.organizationId })
      .skip(skip)
      .take(limit);

    if (filter.term) {
      queryBuilder.andWhere('employee.first_name ILIKE :term OR employee.last_name ILIKE :term OR employee.email ILIKE :term', {
        term: `%${filter.term}%`,
      });
    }

    if (filter.is_active !== undefined) {
      queryBuilder.andWhere('employee.is_active = :is_active', { is_active: filter.is_active });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(emp => {
        const dto = EmployeeResponseDto.fromEntity(emp);
        if (emp.department) {
          (dto as any).department = { id: emp.department.id, name: emp.department.name };
        }
        if (emp.position) {
          (dto as any).position = { id: emp.position.id, title: emp.position.title };
        }
        if (emp.manager) {
          (dto as any).manager = { 
            id: emp.manager.id, 
            first_name: emp.manager.first_name, 
            last_name: emp.manager.last_name 
          };
        }
        return dto;
      }),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['department', 'position', 'manager'],
    });
    
    if (!employee) {
      throw new BadRequestException(
        await this.translationService.translate('hr.employee.not_found', userId)
      );
    }
    
    const dto = EmployeeResponseDto.fromEntity(employee);
    if (employee.department) {
      (dto as any).department = { id: employee.department.id, name: employee.department.name };
    }
    if (employee.position) {
      (dto as any).position = { id: employee.position.id, title: employee.position.title };
    }
    if (employee.manager) {
      (dto as any).manager = { 
        id: employee.manager.id, 
        first_name: employee.manager.first_name, 
        last_name: employee.manager.last_name 
      };
    }
    return dto;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, userId: string): Promise<EmployeeResponseDto> {
    await this.employeeRepository.update(id, updateEmployeeDto);
    const updatedEmployee = await this.findOne(id, userId);
    return updatedEmployee;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.employeeRepository.softDelete(id);
  }

  async findByDepartment(departmentId: string, userId: string): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.find({
      where: { department_id: departmentId },
      relations: ['department', 'position'],
    });
    return employees.map(emp => EmployeeResponseDto.fromEntity(emp));
  }

  async findByManager(managerId: string, userId: string): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.find({
      where: { manager_id: managerId },
      relations: ['department', 'position'],
    });
    return employees.map(emp => EmployeeResponseDto.fromEntity(emp));
  }

  async getActiveEmployeesCount(userId: string): Promise<number> {
    return this.employeeRepository.count({
      where: { is_active: true, organization_id: this.organizationId },
    });
  }

  async getEmployeesByStatus(status: string, userId: string): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.find({
      where: { status, organization_id: this.organizationId },
    });
    return employees.map(emp => EmployeeResponseDto.fromEntity(emp));
  }

  async updateStatus(id: string, status: string, userId: string): Promise<EmployeeResponseDto> {
    await this.employeeRepository.update(id, { status });
    const updatedEmployee = await this.findOne(id, userId);
    return updatedEmployee;
  }

  async toggleActive(id: string, userId: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepository.findOne({
      where: { id, organization_id: this.organizationId },
    });
    
    if (!employee) {
      throw new BadRequestException(
        await this.translationService.translate('hr.employee.not_found', userId)
      );
    }
    
    employee.is_active = !employee.is_active;
    const updatedEmployee = await this.employeeRepository.save(employee);
    return EmployeeResponseDto.fromEntity(updatedEmployee);
  }
}
