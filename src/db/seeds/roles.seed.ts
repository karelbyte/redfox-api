import { DataSource } from 'typeorm';
import { Role } from '../../models/role.entity';
import { Organization } from '../../models/organization.entity';

export class RolesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const roleRepository = dataSource.getRepository(Role);

    const organizationRepository = dataSource.getRepository(Organization);

    // Obtain landlord organization
    const landlordOrg = await organizationRepository.findOne({
      where: { slug: 'landlord' },
    });

    if (!landlordOrg) {
      console.log(
        '⚠️ Landlord organization not found. Be sure to run organizations seed first.',
      );
      return;
    }

    const roles = [
      {
        code: 'ADMIN',
        description: 'Administrador del sistema',
        status: true,
        organization_id: landlordOrg.id,
      },
      {
        code: 'SELLER',
        description: 'Vendedor',
        status: true,
        organization_id: landlordOrg.id,
      },
      {
        code: 'SUPER_ADMIN',
        description: 'Super Administrador — acceso al backoffice',
        status: true,
        organization_id: landlordOrg.id,
      },
    ];

    for (const role of roles) {
      const existingRole = await roleRepository.findOne({
        where: {
          code: role.code,
          organization_id: landlordOrg.id,
        },
      });

      if (!existingRole) {
        await roleRepository.save(role);
      }
    }
  }
}
