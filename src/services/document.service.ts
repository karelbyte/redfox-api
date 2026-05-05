import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../models/employee-document.entity';
import { CreateDocumentDto } from '../dtos/document/create-document.dto';
import { UpdateDocumentDto } from '../dtos/document/update-document.dto';
import { DocumentResponseDto } from '../dtos/document/document-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  async create(createDocumentDto: CreateDocumentDto, userId: string): Promise<DocumentResponseDto> {
    const document = this.documentRepository.create({
      ...createDocumentDto,
      organization_id: this.organizationId,
    });
    const savedDocument = await this.documentRepository.save(document);
    return DocumentResponseDto.fromEntity(savedDocument);
  }

  async findAll(filter: PaginationDto): Promise<PaginatedResponse<DocumentResponseDto>> {
    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.employee', 'employee')
      .where('document.organization_id = :orgId', { orgId: this.organizationId })
      .skip(skip)
      .take(limit)
      .orderBy('document.created_at', 'DESC');

    if (filter.term) {
      queryBuilder.andWhere('document.title ILIKE :term OR employee.first_name ILIKE :term OR employee.last_name ILIKE :term', {
        term: `%${filter.term}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(d => {
        const dto = DocumentResponseDto.fromEntity(d);
        if (d.employee) {
          (dto as any).employee = {
            id: d.employee.id,
            first_name: d.employee.first_name,
            last_name: d.employee.last_name,
            employee_code: d.employee.employee_code,
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

  async findOne(id: string, userId: string): Promise<DocumentResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['employee'],
    });
    
    if (!document) {
      throw new BadRequestException('Document not found');
    }
    
    const dto = DocumentResponseDto.fromEntity(document);
    if (document.employee) {
      (dto as any).employee = {
        id: document.employee.id,
        first_name: document.employee.first_name,
        last_name: document.employee.last_name,
        employee_code: document.employee.employee_code,
      };
    }
    return dto;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, userId: string): Promise<DocumentResponseDto> {
    await this.documentRepository.update(id, updateDocumentDto);
    const updatedDocument = await this.findOne(id, userId);
    return updatedDocument;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.documentRepository.softDelete(id);
  }

  async verify(id: string, userId: string): Promise<DocumentResponseDto> {
    await this.documentRepository.update(id, { is_verified: true });
    return this.findOne(id, userId);
  }

  async updateFilePath(id: string, filePath: string, userId: string): Promise<DocumentResponseDto> {
    await this.documentRepository.update(id, { file_path: filePath });
    return this.findOne(id, userId);
  }
}
