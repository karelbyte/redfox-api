import { DataSource } from 'typeorm';
import { RolePermission } from '../../src/models/role-permission.entity';
import { Role } from '../../src/models/role.entity';
import { Permission } from '../../src/models/permission.entity';

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
      console.log('⚠️ Roles no encontrados. Asegúrate de ejecutar RolesSeed primero.');
      return;
    }

    // Obtener todos los permisos
    const allPermissions = await permissionRepository.find();

    // Asignar todos los permisos al rol ADMIN
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

    // Asignar permisos específicos al rol SELLER
    const sellerPermissions = [
      'user_module_view',
      'role_module_view',
      'permission_module_view',
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