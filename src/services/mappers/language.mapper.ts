import { Language } from '../../models/language.entity';
import { LanguageResponseDto } from '../../dtos/language/language-response.dto';

export class LanguageMapper {
  static toResponseDto(language: Language): LanguageResponseDto {
    if (!language) {
      throw new Error('Language cannot be null');
    }

    return {
      id: language.id,
      code: language.code,
      userId: language.userId,
      createdAt: language.createdAt,
      updatedAt: language.updatedAt,
      deletedAt: language.deletedAt,
    };
  }

  static toResponseDtoList(languages: Language[]): LanguageResponseDto[] {
    return languages.map((language) => this.toResponseDto(language));
  }
}
