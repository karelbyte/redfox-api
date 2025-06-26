import { DataSource } from 'typeorm';
import { User } from '../../src/models/user.entity';
import { Role } from '../../src/models/role.entity';
import { hash } from 'bcrypt';

export class UsersSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);

    // Obtain roles
    const adminRole = await roleRepository.findOne({
      where: { code: 'ADMIN' },
    });

    const sellerRole = await roleRepository.findOne({
      where: { code: 'SELLER' },
    });

    if (!adminRole || !sellerRole) {
      console.log('⚠️ Not found roles.Be sure to run rolesseed first.');
      return;
    }

    const users = [
      {
        name: 'Administrador',
        email: 'admin@redfox.com',
        password: await hash('admin123', 10),
        status: true,
        roles: [adminRole],
      },
      {
        name: 'Vendedor',
        email: 'vendedor@redfox.com',
        password: await hash('seller123', 10),
        status: true,
        roles: [sellerRole],
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
