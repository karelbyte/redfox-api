import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../models/department.entity';
import { CreateDepartmentDto } from '../dtos/department/create-department.dto';
import { UpdateDepartmentDto } from '../dtos/department/update-department.dto';
import { DepartmentResponseDto } from '../dtos/department/department-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
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

  async create(createDepartmentDto: CreateDepartmentDto, userId: string): Promise<DepartmentResponseDto> {
    const department = this.departmentRepository.create({
      ...createDepartmentDto,
      organization_id: this.organizationId,
    });
    const savedDepartment = await this.departmentRepository.save(department);
    return DepartmentResponseDto.fromEntity(savedDepartment);
  }

  async findAll(filter: PaginationDto): Promise<PaginatedResponse<DepartmentResponseDto>> {
    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.departmentRepository
      .createQueryBuilder('department')
      .leftJoinAndSelect('department.manager', 'manager')
      .loadRelationCountAndMap('department.employee_count', 'department.employees')
      .where('department.organization_id = :orgId', { orgId: this.organizationId })
      .skip(skip)
      .take(limit);

    if (filter.term) {
      queryBuilder.andWhere('department.name ILIKE :term', {
        term: `%${filter.term}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(dep => {
        const dto = DepartmentResponseDto.fromEntity(dep);
        if (dep.manager) {
          (dto as any).manager = {
            id: dep.manager.id,
            first_name: dep.manager.first_name,
            last_name: dep.manager.last_name,
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

  async findOne(id: string, userId: string): Promise<DepartmentResponseDto> {
    const department = await this.departmentRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['manager'],
    });
    
    if (!department) {
      throw new BadRequestException(
        await this.translationService.translate('hr.department.not_found', userId)
      );
    }
    
    const dto = DepartmentResponseDto.fromEntity(department);
    if (department.manager) {
      (dto as any).manager = {
        id: department.manager.id,
        first_name: department.manager.first_name,
        last_name: department.manager.last_name,
      };
    }
    return dto;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto, userId: string): Promise<DepartmentResponseDto> {
    await this.departmentRepository.update(id, updateDepartmentDto);
    const updatedDepartment = await this.findOne(id, userId);
    return updatedDepartment;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.departmentRepository.softDelete(id);
  }
}
