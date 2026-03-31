import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettings } from '../models/company-settings.entity';
import { UpdateCompanySettingsDto } from '../dtos/company-settings/update-company-settings.dto';
import { CompanySettingsResponseDto } from '../dtos/company-settings/company-settings-response.dto';
import { CompanySettingsMapper } from './mappers/company-settings.mapper';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class CompanySettingsService {
  constructor(
    @InjectRepository(CompanySettings)
    private readonly companySettingsRepository: Repository<CompanySettings>,
    private readonly companySettingsMapper: CompanySettingsMapper,
    private readonly tenantContext: TenantContext,
  ) { }

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException(
        'Organization context is required for Company Settings',
      );
    }
    return orgId;
  }

  async get(): Promise<CompanySettingsResponseDto> {
    let settings = await this.companySettingsRepository.findOne({
      where: { organization_id: this.organizationId },
    });

    if (!settings) {
      settings = this.companySettingsRepository.create({
        organization_id: this.organizationId,
      });
      settings = await this.companySettingsRepository.save(settings);
    }

    return this.companySettingsMapper.mapToResponseDto(settings);
  }

  async update(
    dto: UpdateCompanySettingsDto,
  ): Promise<CompanySettingsResponseDto> {
    let settings = await this.companySettingsRepository.findOne({
      where: { organization_id: this.organizationId },
    });

    if (!settings) {
      settings = this.companySettingsRepository.create({
        organization_id: this.organizationId,
      });
      settings = await this.companySettingsRepository.save(settings);
    }

    Object.assign(settings, dto);
    const updated = await this.companySettingsRepository.save(settings);

    return this.companySettingsMapper.mapToResponseDto(updated);
  }

  async updateLogoUrl(logoUrl: string): Promise<CompanySettingsResponseDto> {
    let settings = await this.companySettingsRepository.findOne({
      where: { organization_id: this.organizationId },
    });

    if (!settings) {
      settings = this.companySettingsRepository.create({
        organization_id: this.organizationId,
      });
      settings = await this.companySettingsRepository.save(settings);
    }

    settings.logoUrl = logoUrl;
    const updated = await this.companySettingsRepository.save(settings);

    return this.companySettingsMapper.mapToResponseDto(updated);
  }
}
