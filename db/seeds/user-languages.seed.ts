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
      // Search the user admin
      const adminUser = await userRepository.findOne({
        where: { email: 'admin@redfox.com' },
      });

      if (adminUser) {
        // Look for the Spanish language
        const spanishLanguage = await languageRepository.findOne({
          where: { code: 'es' },
        });

        if (spanishLanguage) {
          // Create a specific entry for the admin user with Spanish
          const adminUserLanguage = languageRepository.create({
            userId: adminUser.id,
            code: 'es',
          });

          await languageRepository.save(adminUserLanguage);
          console.log('✅ Admin user language set to Spanish');
        } else {
          console.log(
            '⚠️  Spanish language not found, skipping admin user language setup',
          );
        }
      }

      console.log('✅ User languages seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding user languages:', error);
      throw error;
    }
  }
}
