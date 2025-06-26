import { DataSource } from 'typeorm';
import { Language } from '../../src/models/language.entity';
import { User } from '../../src/models/user.entity';

export class UserLanguagesSeed {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const languageRepository = this.dataSource.getRepository(Language);
    const userRepository = this.dataSource.getRepository(User);

    console.log('🌍 Seeding user languages...');

    try {
      // Buscar el usuario admin
      const adminUser = await userRepository.findOne({
        where: { email: 'admin@redfox.com' },
      });

      if (adminUser) {
        // Buscar el idioma español
        const spanishLanguage = await languageRepository.findOne({
          where: { code: 'es' },
        });

        if (spanishLanguage) {
          // Crear una entrada específica para el usuario admin con español
          const userLanguage = languageRepository.create({
            code: spanishLanguage.code,
            userId: adminUser.id,
          });

          await languageRepository.save(userLanguage);
          console.log(`✅ Idioma español asignado al usuario admin`);
        }
      }

      console.log('✅ User languages seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding user languages:', error);
      throw error;
    }
  }
}
