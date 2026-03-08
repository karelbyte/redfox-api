import { DataSource } from 'typeorm';
import { User } from 'src/models/user.entity';
import { Role } from 'src/models/role.entity';
import { Organization } from 'src/models/organization.entity';
import { hash } from 'bcrypt';

export class UsersSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);

    const organizationRepository = dataSource.getRepository(Organization);

    // Obtain roles
    const adminRole = await roleRepository.findOne({
      where: { code: 'ADMIN' },
    });

    const sellerRole = await roleRepository.findOne({
      where: { code: 'SELLER' },
    });

    // Obtain landlord organization
    const landlordOrg = await organizationRepository.findOne({
      where: { slug: 'landlord' },
    });

    if (!adminRole || !sellerRole || !landlordOrg) {
      console.log('⚠️ Not found roles or landlord organization. Be sure to run permissions, roles and organizations seeds first.');
      return;
    }

    const users = [
      {
        name: 'Administrador',
        email: 'admin@nitro.com',
        password: await hash('admin123', 10),
        status: true,
        roles: [adminRole],
        organization_id: landlordOrg.id,
      },
      {
        name: 'Vendedor',
        email: 'vendedor@nitro.com',
        password: await hash('seller123', 10),
        status: true,
        roles: [sellerRole],
        organization_id: landlordOrg.id,
      },
    ];

    for (const userData of users) {
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        await userRepository.save(userData);
      }
    }
  }
}
