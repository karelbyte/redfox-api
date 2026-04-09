import { DataSource } from 'typeorm';
import { Language } from '../../models/language.entity';
import { User } from '../../models/user.entity';

export class UserLanguagesSeed {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const languageRepository = this.dataSource.getRepository(Language);
    const userRepository = this.dataSource.getRepository(User);

    console.log('🌍 Seeding user languages...');

    try {
      // Search the user admin
      const adminUser = await userRepository.findOne({
        where: { email: 'admin@nitro.com' },
      });

      if (adminUser) {
        const existingAdminLanguage = await languageRepository.findOne({
          where: {
            organization_id: adminUser.organization_id,
            userId: adminUser.id,
          },
        });

        if (!existingAdminLanguage) {
          // Create a specific entry for the admin user with Spanish
          const adminUserLanguage = languageRepository.create({
            organization_id: adminUser.organization_id,
            userId: adminUser.id,
            code: 'es',
          });

          await languageRepository.save(adminUserLanguage);
          console.log('✅ Admin user language set to Spanish');
        } else {
          console.log('ℹ️  Admin user language already configured, skipping');
        }
      }

      console.log('✅ User languages seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding user languages:', error);
      throw error;
    }
  }
}
