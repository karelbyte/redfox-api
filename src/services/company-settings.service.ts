import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettings } from '../models/company-settings.entity';
import { UpdateCompanySettingsDto } from '../dtos/company-settings/update-company-settings.dto';
import { CompanySettingsResponseDto } from '../dtos/company-settings/company-settings-response.dto';
import { CompanySettingsMapper } from './mappers/company-settings.mapper';

@Injectable()
export class CompanySettingsService {
  constructor(
    @InjectRepository(CompanySettings)
    private readonly companySettingsRepository: Repository<CompanySettings>,
    private readonly companySettingsMapper: CompanySettingsMapper,
  ) {}

  async get(): Promise<CompanySettingsResponseDto> {
    let settings = await this.companySettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!settings) {
      settings = this.companySettingsRepository.create({});
      settings = await this.companySettingsRepository.save(settings);
    }

    return this.companySettingsMapper.mapToResponseDto(settings);
  }

  async update(
    dto: UpdateCompanySettingsDto,
  ): Promise<CompanySettingsResponseDto> {
    let settings = await this.companySettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!settings) {
      settings = this.companySettingsRepository.create({});
      settings = await this.companySettingsRepository.save(settings);
    }

    const updated = await this.companySettingsRepository.save({
      ...settings,
      ...dto,
    });

    return this.companySettingsMapper.mapToResponseDto(updated);
  }

  async updateLogoUrl(logoUrl: string): Promise<CompanySettingsResponseDto> {
    let settings = await this.companySettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!settings) {
      settings = this.companySettingsRepository.create({});
      settings = await this.companySettingsRepository.save(settings);
    }

    const updated = await this.companySettingsRepository.save({
      ...settings,
      logoUrl,
    });

    return this.companySettingsMapper.mapToResponseDto(updated);
  }
}
