import { Language } from '../../models/language.entity';
import { LanguageResponseDto } from '../../dtos/language/language-response.dto';

export class LanguageMapper {
  static toResponseDto(language: Language): LanguageResponseDto {
    return {
      id: language.id,
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      isDefault: language.isDefault,
      isActive: language.isActive,
      createdAt: language.createdAt,
      updatedAt: language.updatedAt,
      deletedAt: language.deletedAt,
    };
  }

  static toResponseDtoList(languages: Language[]): LanguageResponseDto[] {
    return languages.map((language) => this.toResponseDto(language));
  }
}
