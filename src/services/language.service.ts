import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../models/language.entity';
import { CreateLanguageDto } from '../dtos/language/create-language.dto';
import { LanguageMapper } from './mappers/language.mapper';
import { LanguageResponseDto } from '../dtos/language/language-response.dto';
import { TranslationService } from './translation.service';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
    private translationService: TranslationService,
    private tenantContext: TenantContext,
  ) {}

  async create(createLanguageDto: CreateLanguageDto): Promise<void> {
    const orgId = this.tenantContext.getOrganizationId();

    if (!orgId) {
      // Si no hay organización en el contexto (por ejemplo, durante el registro inicial),
      // omitimos el guardado hasta que el usuario esté asociado.
      return;
    }

    const existingLanguage = await this.languageRepository.findOne({
      where: { userId: createLanguageDto.userId, organization_id: orgId },
    });

    if (existingLanguage) {
      existingLanguage.code = createLanguageDto.code;
      await this.languageRepository.save(existingLanguage);
    } else {
      await this.languageRepository.save({
        code: createLanguageDto.code,
        userId: createLanguageDto.userId,
        organization_id: orgId,
      });
    }
  }

  async findOne(
    id: string,
    languageCode?: string,
  ): Promise<LanguageResponseDto> {
    const orgId = this.tenantContext.getOrganizationId();
    const language = await this.languageRepository.findOne({
      where: { id, ...(orgId ? { organization_id: orgId } : {}) },
    });

    if (!language) {
      const message = await this.translationService.translateWithLanguage(
        'language.not_found',
        languageCode,
        { id },
      );
      throw new NotFoundException(message);
    }

    return LanguageMapper.toResponseDto(language);
  }

  async findByCode(
    code: string,
    languageCode?: string,
  ): Promise<LanguageResponseDto> {
    const orgId = this.tenantContext.getOrganizationId();
    const language = await this.languageRepository.findOne({
      where: { code, ...(orgId ? { organization_id: orgId } : {}) },
    });

    if (!language) {
      const message = await this.translationService.translateWithLanguage(
        'language.code_not_found',
        languageCode,
        { code },
      );
      throw new NotFoundException(message);
    }

    return LanguageMapper.toResponseDto(language);
  }
}
