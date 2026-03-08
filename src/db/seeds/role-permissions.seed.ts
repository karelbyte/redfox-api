import { DataSource } from 'typeorm';
import { RolePermission } from 'src/models/role-permission.entity';
import { Role } from 'src/models/role.entity';
import { Permission } from 'src/models/permission.entity';
import { Organization } from 'src/models/organization.entity';

export class RolePermissionsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const rolePermissionRepository = dataSource.getRepository(RolePermission);
    const roleRepository = dataSource.getRepository(Role);
    const permissionRepository = dataSource.getRepository(Permission);

    const organizationRepository = dataSource.getRepository(Organization);

    // Obtain landlord organization
    const landlordOrg = await organizationRepository.findOne({
      where: { slug: 'landlord' },
    });

    if (!landlordOrg) {
      console.log('⚠️ Landlord organization not found. Be sure to run organizations seed first.');
      return;
    }

    // Obtener roles de la organización landlord
    const adminRole = await roleRepository.findOne({
      where: {
        code: 'ADMIN',
        organization_id: landlordOrg.id,
      },
    });

    const sellerRole = await roleRepository.findOne({
      where: {
        code: 'SELLER',
        organization_id: landlordOrg.id,
      },
    });

    if (!adminRole || !sellerRole) {
      console.log('⚠️ Not found roles for landslide organization. Be sure to run roles seed first.');
      return;
    }

    // Obtain all permits
    const allPermissions = await permissionRepository.find();

    // Assign all permissions to the admin role
    for (const permission of allPermissions) {
      const existingRolePermission = await rolePermissionRepository.findOne({
        where: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });

      if (!existingRolePermission) {
        await rolePermissionRepository.save({
          roleId: adminRole.id,
          permissionId: permission.id,
        });
      }
    }

    // Assign specific permissions to the SELLER role
    const sellerPermissions = [
      'client_module_view',
      'client_create',
      'client_read',
      'client_update',
      'product_module_view',
      'product_read',
      'inventory_module_view',
      'inventory_read',
      'withdrawal_module_view',
      'withdrawal_create',
      'withdrawal_read',
      'withdrawal_update',
      'quotation_module_view',
      'quotation_create',
      'quotation_read',
      'quotation_update',
      'quotation_convert_to_sale',
      'notification_module_view',
      'notification_read',
      'notification_update',
      'notification_mark_read',
    ];

    for (const permissionCode of sellerPermissions) {
      const permission = await permissionRepository.findOne({
        where: { code: permissionCode },
      });

      if (permission) {
        const existingRolePermission = await rolePermissionRepository.findOne({
          where: {
            roleId: sellerRole.id,
            permissionId: permission.id,
          },
        });

        if (!existingRolePermission) {
          await rolePermissionRepository.save({
            roleId: sellerRole.id,
            permissionId: permission.id,
          });
        }
      }
    }
  }
}
