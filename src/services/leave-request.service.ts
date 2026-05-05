import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest, LeaveStatus } from '../models/leave-request.entity';
import { CreateLeaveRequestDto } from '../dtos/leave-request/create-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dtos/leave-request/update-leave-request.dto';
import { LeaveRequestResponseDto } from '../dtos/leave-request/leave-request-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class LeaveRequestService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  async create(createLeaveRequestDto: CreateLeaveRequestDto, userId: string): Promise<LeaveRequestResponseDto> {
    const leaveRequest = this.leaveRequestRepository.create({
      ...createLeaveRequestDto,
      organization_id: this.organizationId,
      status: createLeaveRequestDto.status || LeaveStatus.PENDING,
    });
    const savedLeaveRequest = await this.leaveRequestRepository.save(leaveRequest);
    return LeaveRequestResponseDto.fromEntity(savedLeaveRequest);
  }

  async findAll(filter: PaginationDto): Promise<PaginatedResponse<LeaveRequestResponseDto>> {
    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.leaveRequestRepository
      .createQueryBuilder('leave_request')
      .leftJoinAndSelect('leave_request.employee', 'employee')
      .where('leave_request.organization_id = :orgId', { orgId: this.organizationId })
      .skip(skip)
      .take(limit)
      .orderBy('leave_request.start_date', 'DESC');

    if (filter.term) {
      queryBuilder.andWhere('employee.first_name ILIKE :term OR employee.last_name ILIKE :term', {
        term: `%${filter.term}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(lr => {
        const dto = LeaveRequestResponseDto.fromEntity(lr);
        if (lr.employee) {
          (dto as any).employee = {
            id: lr.employee.id,
            first_name: lr.employee.first_name,
            last_name: lr.employee.last_name,
            employee_code: lr.employee.employee_code,
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

  async findOne(id: string, userId: string): Promise<LeaveRequestResponseDto> {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['employee'],
    });
    
    if (!leaveRequest) {
      throw new BadRequestException('Leave Request not found');
    }
    
    const dto = LeaveRequestResponseDto.fromEntity(leaveRequest);
    if (leaveRequest.employee) {
      (dto as any).employee = {
        id: leaveRequest.employee.id,
        first_name: leaveRequest.employee.first_name,
        last_name: leaveRequest.employee.last_name,
        employee_code: leaveRequest.employee.employee_code,
      };
    }
    return dto;
  }

  async update(id: string, updateLeaveRequestDto: UpdateLeaveRequestDto, userId: string): Promise<LeaveRequestResponseDto> {
    await this.leaveRequestRepository.update(id, updateLeaveRequestDto);
    const updatedLeaveRequest = await this.findOne(id, userId);
    return updatedLeaveRequest;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.leaveRequestRepository.softDelete(id);
  }

  async approve(id: string, userId: string): Promise<LeaveRequestResponseDto> {
    await this.leaveRequestRepository.update(id, { 
      status: LeaveStatus.APPROVED,
      approved_by: userId,
      approved_at: new Date()
    });
    return this.findOne(id, userId);
  }

  async reject(id: string, userId: string): Promise<LeaveRequestResponseDto> {
    await this.leaveRequestRepository.update(id, { 
      status: LeaveStatus.REJECTED,
      approved_by: userId,
      approved_at: new Date()
    });
    return this.findOne(id, userId);
  }
}
