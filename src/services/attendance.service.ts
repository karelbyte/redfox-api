import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from '../models/attendance.entity';
import { CreateAttendanceDto } from '../dtos/attendance/create-attendance.dto';
import { UpdateAttendanceDto } from '../dtos/attendance/update-attendance.dto';
import { AttendanceResponseDto } from '../dtos/attendance/attendance-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  async create(createAttendanceDto: CreateAttendanceDto, userId: string): Promise<AttendanceResponseDto> {
    const attendance = this.attendanceRepository.create({
      ...createAttendanceDto,
      organization_id: this.organizationId,
    });
    // Set default hours if not provided
    if (attendance.work_hours === undefined) {
      attendance.work_hours = 0;
    }
    const savedAttendance = await this.attendanceRepository.save(attendance);
    return AttendanceResponseDto.fromEntity(savedAttendance);
  }

  async findAll(filter: PaginationDto): Promise<PaginatedResponse<AttendanceResponseDto>> {
    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.organization_id = :orgId', { orgId: this.organizationId })
      .skip(skip)
      .take(limit)
      .orderBy('attendance.date', 'DESC');

    // Attendance-specific filters (e.g. term to search employee name)
    if (filter.term) {
      queryBuilder.andWhere('employee.first_name ILIKE :term OR employee.last_name ILIKE :term', {
        term: `%${filter.term}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(att => {
        const dto = AttendanceResponseDto.fromEntity(att);
        if (att.employee) {
          (dto as any).employee = {
            id: att.employee.id,
            first_name: att.employee.first_name,
            last_name: att.employee.last_name,
            employee_code: att.employee.employee_code,
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

  async findOne(id: string, userId: string): Promise<AttendanceResponseDto> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['employee'],
    });
    
    if (!attendance) {
      throw new BadRequestException('Attendance not found');
    }
    
    const dto = AttendanceResponseDto.fromEntity(attendance);
    if (attendance.employee) {
      (dto as any).employee = {
        id: attendance.employee.id,
        first_name: attendance.employee.first_name,
        last_name: attendance.employee.last_name,
        employee_code: attendance.employee.employee_code,
      };
    }
    return dto;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto, userId: string): Promise<AttendanceResponseDto> {
    await this.attendanceRepository.update(id, updateAttendanceDto);
    const updatedAttendance = await this.findOne(id, userId);
    return updatedAttendance;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.attendanceRepository.softDelete(id);
  }
}
