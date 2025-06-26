import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../models/language.entity';
import { CreateLanguageDto } from '../dtos/language/create-language.dto';
import { UpdateLanguageDto } from '../dtos/language/update-language.dto';
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

  async create(
    createLanguageDto: CreateLanguageDto,
    languageCode?: string,
  ): Promise<LanguageResponseDto> {
    const existingLanguage = await this.languageRepository.findOne({
      where: { code: createLanguageDto.code },
    });

    if (existingLanguage) {
      const message = await this.translationService.translateWithLanguage(
        'language.already_exists',
        languageCode,
      );
      throw new ConflictException(message);
    }

    // Si se está creando un idioma por defecto, desactivar otros
    if (createLanguageDto.isDefault) {
      await this.languageRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    const language = this.languageRepository.create({
      code: createLanguageDto.code,
      name: createLanguageDto.name,
      nativeName: createLanguageDto.nativeName,
      isDefault: createLanguageDto.isDefault || false,
      isActive:
        createLanguageDto.isActive !== undefined
          ? createLanguageDto.isActive
          : true,
    });

    const savedLanguage = await this.languageRepository.save(language);
    return LanguageMapper.toResponseDto(savedLanguage);
  }

  async findAll(languageCode?: string): Promise<LanguageResponseDto[]> {
    const languages = await this.languageRepository.find({
      order: { isDefault: 'DESC', name: 'ASC' },
    });
    return LanguageMapper.toResponseDtoList(languages);
  }

  async findActive(languageCode?: string): Promise<LanguageResponseDto[]> {
    const languages = await this.languageRepository.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
    return LanguageMapper.toResponseDtoList(languages);
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

  async getDefaultLanguage(
    languageCode?: string,
  ): Promise<LanguageResponseDto> {
    const language = await this.languageRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (!language) {
      const message = await this.translationService.translateWithLanguage(
        'language.no_default_found',
        languageCode,
      );
      throw new NotFoundException(message);
    }

    return LanguageMapper.toResponseDto(language);
  }

  async update(
    id: string,
    updateLanguageDto: UpdateLanguageDto,
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

    if (updateLanguageDto.code) {
      const existingLanguage = await this.languageRepository.findOne({
        where: { code: updateLanguageDto.code, id: { $ne: id } as any },
      });

      if (existingLanguage) {
        const message = await this.translationService.translateWithLanguage(
          'language.already_exists',
          languageCode,
        );
        throw new ConflictException(message);
      }
    }

    // Si se está estableciendo como idioma por defecto, desactivar otros
    if (updateLanguageDto.isDefault) {
      await this.languageRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(language, updateLanguageDto);
    const updatedLanguage = await this.languageRepository.save(language);

    return LanguageMapper.toResponseDto(updatedLanguage);
  }

  async remove(id: string, languageCode?: string): Promise<void> {
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

    if (language.isDefault) {
      const message = await this.translationService.translateWithLanguage(
        'language.cannot_delete_default',
        languageCode,
      );
      throw new ConflictException(message);
    }

    await this.languageRepository.softDelete(id);
  }

  async setDefaultLanguage(
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

    // Desactivar otros idiomas por defecto
    await this.languageRepository.update(
      { isDefault: true },
      { isDefault: false },
    );

    // Establecer este idioma como predeterminado
    language.isDefault = true;
    const updatedLanguage = await this.languageRepository.save(language);

    return LanguageMapper.toResponseDto(updatedLanguage);
  }
}
