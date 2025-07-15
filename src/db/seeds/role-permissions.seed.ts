import { DataSource } from 'typeorm';
import { RolePermission } from 'src/models/role-permission.entity';
import { Role } from 'src/models/role.entity';
import { Permission } from 'src/models/permission.entity';

export class RolePermissionsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const rolePermissionRepository = dataSource.getRepository(RolePermission);
    const roleRepository = dataSource.getRepository(Role);
    const permissionRepository = dataSource.getRepository(Permission);

    // Obtener roles
    const adminRole = await roleRepository.findOne({
      where: { code: 'ADMIN' },
    });

    const sellerRole = await roleRepository.findOne({
      where: { code: 'SELLER' },
    });

    if (!adminRole || !sellerRole) {
      console.log('⚠️ Not found roles. Be sure to run rolesseed first.');
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
