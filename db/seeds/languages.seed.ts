import { DataSource } from 'typeorm';
import { Language } from '../../src/models/language.entity';

export class LanguagesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const languageRepository = dataSource.getRepository(Language);

    const languages = [
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        isDefault: true,
        isActive: true,
      },
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        isDefault: false,
        isActive: true,
      },
    ];

    for (const language of languages) {
      const existingLanguage = await languageRepository.findOne({
        where: { code: language.code },
      });

      if (!existingLanguage) {
        await languageRepository.save(language);
      }
    }
  }
}
