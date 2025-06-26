import { DataSource } from 'typeorm';
import { Permission } from '../../src/models/permission.entity';

export class PermissionsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);

    const permissions = [
      {
        code: 'user_module_view',
        description: 'Permite ver el módulo de usuarios',
      },
      {
        code: 'user_create',
        description: 'Permite crear usuarios',
      },
      {
        code: 'user_update',
        description: 'Permite actualizar usuarios',
      },
      {
        code: 'user_delete',
        description: 'Permite eliminar usuarios',
      },
      {
        code: 'role_module_view',
        description: 'Permite ver el módulo de roles',
      },
      {
        code: 'role_create',
        description: 'Permite crear roles',
      },
      {
        code: 'role_update',
        description: 'Permite actualizar roles',
      },
      {
        code: 'role_delete',
        description: 'Permite eliminar roles',
      },
      {
        code: 'permission_module_view',
        description: 'Permite ver el módulo de permisos',
      },
      {
        code: 'permission_create',
        description: 'Permite crear permisos',
      },
      {
        code: 'permission_update',
        description: 'Permite actualizar permisos',
      },
      {
        code: 'permission_delete',
        description: 'Permite eliminar permisos',
      },
    ];

    for (const permission of permissions) {
      const existingPermission = await permissionRepository.findOne({
        where: { code: permission.code },
      });

      if (!existingPermission) {
        await permissionRepository.save(permission);
      }
    }
  }
} 