import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll, PayrollStatus } from '../models/payroll.entity';
import { CreatePayrollDto } from '../dtos/payroll/create-payroll.dto';
import { UpdatePayrollDto } from '../dtos/payroll/update-payroll.dto';
import { PayrollResponseDto } from '../dtos/payroll/payroll-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollRepository: Repository<Payroll>,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  async create(createPayrollDto: CreatePayrollDto, userId: string): Promise<PayrollResponseDto> {
    const payroll = this.payrollRepository.create({
      ...createPayrollDto,
      organization_id: this.organizationId,
      status: createPayrollDto.status || PayrollStatus.PENDING,
    });
    const savedPayroll = await this.payrollRepository.save(payroll);
    return PayrollResponseDto.fromEntity(savedPayroll);
  }

  async findAll(filter: PaginationDto): Promise<PaginatedResponse<PayrollResponseDto>> {
    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.payrollRepository
      .createQueryBuilder('payroll')
      .leftJoinAndSelect('payroll.employee', 'employee')
      .where('payroll.organization_id = :orgId', { orgId: this.organizationId })
      .skip(skip)
      .take(limit)
      .orderBy('payroll.period_start', 'DESC');

    if (filter.term) {
      queryBuilder.andWhere('employee.first_name ILIKE :term OR employee.last_name ILIKE :term', {
        term: `%${filter.term}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(p => {
        const dto = PayrollResponseDto.fromEntity(p);
        if (p.employee) {
          (dto as any).employee = {
            id: p.employee.id,
            first_name: p.employee.first_name,
            last_name: p.employee.last_name,
            employee_code: p.employee.employee_code,
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

  async findOne(id: string, userId: string): Promise<PayrollResponseDto> {
    const payroll = await this.payrollRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['employee'],
    });
    
    if (!payroll) {
      throw new BadRequestException('Payroll record not found');
    }
    
    const dto = PayrollResponseDto.fromEntity(payroll);
    if (payroll.employee) {
      (dto as any).employee = {
        id: payroll.employee.id,
        first_name: payroll.employee.first_name,
        last_name: payroll.employee.last_name,
        employee_code: payroll.employee.employee_code,
      };
    }
    return dto;
  }

  async update(id: string, updatePayrollDto: UpdatePayrollDto, userId: string): Promise<PayrollResponseDto> {
    await this.payrollRepository.update(id, updatePayrollDto);
    const updatedPayroll = await this.findOne(id, userId);
    return updatedPayroll;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.payrollRepository.softDelete(id);
  }

  async process(id: string, userId: string): Promise<PayrollResponseDto> {
    await this.payrollRepository.update(id, { 
      status: PayrollStatus.PROCESSED,
      processed_at: new Date()
    });
    return this.findOne(id, userId);
  }
}
