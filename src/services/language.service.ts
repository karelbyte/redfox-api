import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../models/language.entity';
import { CreateLanguageDto } from '../dtos/language/create-language.dto';
import { LanguageMapper } from './mappers/language.mapper';
import { LanguageResponseDto } from '../dtos/language/language-response.dto';
import { TranslationService } from './translation.service';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
    private translationService: TranslationService,
  ) {}

  async create(createLanguageDto: CreateLanguageDto): Promise<void> {
    const existingLanguage = await this.languageRepository.findOne({
      where: { userId: createLanguageDto.userId },
    });

    if (existingLanguage) {
      existingLanguage.code = createLanguageDto.code;
      await this.languageRepository.save(existingLanguage);
    } else {
      await this.languageRepository.save({
        code: createLanguageDto.code,
        userId: createLanguageDto.userId,
      });
    }
  }

  async findOne(
    id: string,
    languageCode?: string,
  ): Promise<LanguageResponseDto> {
    const language = await this.languageRepository.findOne({
      where: { id },
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
    const language = await this.languageRepository.findOne({
      where: { code },
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
