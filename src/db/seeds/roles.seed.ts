import { DataSource } from 'typeorm';
import { Role } from 'src/models/role.entity';

export class RolesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const roleRepository = dataSource.getRepository(Role);

    const roles = [
      {
        code: 'ADMIN',
        description: 'Administrador del sistema',
        status: true,
      },
      {
        code: 'SELLER',
        description: 'Vendedor',
        status: true,
      },
    ];

    for (const role of roles) {
      const existingRole = await roleRepository.findOne({
        where: { code: role.code },
      });

      if (!existingRole) {
        await roleRepository.save(role);
      }
    }
  }
}
