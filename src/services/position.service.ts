import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../models/position.entity';
import { CreatePositionDto } from '../dtos/position/create-position.dto';
import { UpdatePositionDto } from '../dtos/position/update-position.dto';
import { PositionResponseDto } from '../dtos/position/position-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
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

  async create(createPositionDto: CreatePositionDto, userId: string): Promise<PositionResponseDto> {
    const position = this.positionRepository.create({
      ...createPositionDto,
      organization_id: this.organizationId,
    });
    const savedPosition = await this.positionRepository.save(position);
    return PositionResponseDto.fromEntity(savedPosition);
  }

  async findAll(filter: PaginationDto): Promise<PaginatedResponse<PositionResponseDto>> {
    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.positionRepository
      .createQueryBuilder('position')
      .leftJoinAndSelect('position.department', 'department')
      .loadRelationCountAndMap('position.employee_count', 'position.employees')
      .where('position.organization_id = :orgId', { orgId: this.organizationId })
      .skip(skip)
      .take(limit);

    if (filter.term) {
      queryBuilder.andWhere('position.title ILIKE :term', {
        term: `%${filter.term}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(pos => {
        const dto = PositionResponseDto.fromEntity(pos);
        if (pos.department) {
          (dto as any).department = {
            id: pos.department.id,
            name: pos.department.name,
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

  async findOne(id: string, userId: string): Promise<PositionResponseDto> {
    const position = await this.positionRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['department'],
    });
    
    if (!position) {
      throw new BadRequestException(
        await this.translationService.translate('hr.position.not_found', userId)
      );
    }
    
    const dto = PositionResponseDto.fromEntity(position);
    if (position.department) {
      (dto as any).department = {
        id: position.department.id,
        name: position.department.name,
      };
    }
    return dto;
  }

  async update(id: string, updatePositionDto: UpdatePositionDto, userId: string): Promise<PositionResponseDto> {
    await this.positionRepository.update(id, updatePositionDto);
    const updatedPosition = await this.findOne(id, userId);
    return updatedPosition;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.positionRepository.softDelete(id);
  }
}
