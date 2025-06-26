import { DataSource } from 'typeorm';
import { Permission } from '../../src/models/permission.entity';

export class PermissionsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);

    const permissions = [
      // Permisos de Usuarios
      {
        code: 'user_module_view',
        module: 'users',
        description: 'Permite ver el módulo de usuarios',
      },
      {
        code: 'user_create',
        module: 'users',
        description: 'Permite crear usuarios',
      },
      {
        code: 'user_read',
        module: 'users',
        description: 'Permite leer usuarios',
      },
      {
        code: 'user_update',
        module: 'users',
        description: 'Permite actualizar usuarios',
      },
      {
        code: 'user_delete',
        module: 'users',
        description: 'Permite eliminar usuarios',
      },

      // Permisos de Roles
      {
        code: 'role_module_view',
        module: 'roles',
        description: 'Permite ver el módulo de roles',
      },
      {
        code: 'role_create',
        module: 'roles',
        description: 'Permite crear roles',
      },
      {
        code: 'role_read',
        module: 'roles',
        description: 'Permite leer roles',
      },
      {
        code: 'role_update',
        module: 'roles',
        description: 'Permite actualizar roles',
      },
      {
        code: 'role_delete',
        module: 'roles',
        description: 'Permite eliminar roles',
      },

      // Permisos de Permisos
      {
        code: 'permission_module_view',
        module: 'permissions',
        description: 'Permite ver el módulo de permisos',
      },
      {
        code: 'permission_create',
        module: 'permissions',
        description: 'Permite crear permisos',
      },
      {
        code: 'permission_read',
        module: 'permissions',
        description: 'Permite leer permisos',
      },
      {
        code: 'permission_update',
        module: 'permissions',
        description: 'Permite actualizar permisos',
      },
      {
        code: 'permission_delete',
        module: 'permissions',
        description: 'Permite eliminar permisos',
      },

      // Permisos de Idiomas
      {
        code: 'language_module_view',
        module: 'languages',
        description: 'Permite ver el módulo de idiomas',
      },
      {
        code: 'language_create',
        module: 'languages',
        description: 'Permite crear idiomas',
      },
      {
        code: 'language_read',
        module: 'languages',
        description: 'Permite leer idiomas',
      },
      {
        code: 'language_update',
        module: 'languages',
        description: 'Permite actualizar idiomas',
      },
      {
        code: 'language_delete',
        module: 'languages',
        description: 'Permite eliminar idiomas',
      },

      // Permisos de Clientes
      {
        code: 'client_module_view',
        module: 'clients',
        description: 'Permite ver el módulo de clientes',
      },
      {
        code: 'client_create',
        module: 'clients',
        description: 'Permite crear clientes',
      },
      {
        code: 'client_read',
        module: 'clients',
        description: 'Permite leer clientes',
      },
      {
        code: 'client_update',
        module: 'clients',
        description: 'Permite actualizar clientes',
      },
      {
        code: 'client_delete',
        module: 'clients',
        description: 'Permite eliminar clientes',
      },

      // Permisos de Proveedores
      {
        code: 'provider_module_view',
        module: 'providers',
        description: 'Permite ver el módulo de proveedores',
      },
      {
        code: 'provider_create',
        module: 'providers',
        description: 'Permite crear proveedores',
      },
      {
        code: 'provider_read',
        module: 'providers',
        description: 'Permite leer proveedores',
      },
      {
        code: 'provider_update',
        module: 'providers',
        description: 'Permite actualizar proveedores',
      },
      {
        code: 'provider_delete',
        module: 'providers',
        description: 'Permite eliminar proveedores',
      },

      // Permisos de Unidades de Medida
      {
        code: 'measurement_unit_module_view',
        module: 'measurement_units',
        description: 'Permite ver el módulo de unidades de medida',
      },
      {
        code: 'measurement_unit_create',
        module: 'measurement_units',
        description: 'Permite crear unidades de medida',
      },
      {
        code: 'measurement_unit_read',
        module: 'measurement_units',
        description: 'Permite leer unidades de medida',
      },
      {
        code: 'measurement_unit_update',
        module: 'measurement_units',
        description: 'Permite actualizar unidades de medida',
      },
      {
        code: 'measurement_unit_delete',
        module: 'measurement_units',
        description: 'Permite eliminar unidades de medida',
      },

      // Permisos de Marcas
      {
        code: 'brand_module_view',
        module: 'brands',
        description: 'Permite ver el módulo de marcas',
      },
      {
        code: 'brand_create',
        module: 'brands',
        description: 'Permite crear marcas',
      },
      {
        code: 'brand_read',
        module: 'brands',
        description: 'Permite leer marcas',
      },
      {
        code: 'brand_update',
        module: 'brands',
        description: 'Permite actualizar marcas',
      },
      {
        code: 'brand_delete',
        module: 'brands',
        description: 'Permite eliminar marcas',
      },

      // Permisos de Categorías
      {
        code: 'category_module_view',
        module: 'categories',
        description: 'Permite ver el módulo de categorías',
      },
      {
        code: 'category_create',
        module: 'categories',
        description: 'Permite crear categorías',
      },
      {
        code: 'category_read',
        module: 'categories',
        description: 'Permite leer categorías',
      },
      {
        code: 'category_update',
        module: 'categories',
        description: 'Permite actualizar categorías',
      },
      {
        code: 'category_delete',
        module: 'categories',
        description: 'Permite eliminar categorías',
      },

      // Permisos de Impuestos
      {
        code: 'tax_module_view',
        module: 'taxes',
        description: 'Permite ver el módulo de impuestos',
      },
      {
        code: 'tax_create',
        module: 'taxes',
        description: 'Permite crear impuestos',
      },
      {
        code: 'tax_read',
        module: 'taxes',
        description: 'Permite leer impuestos',
      },
      {
        code: 'tax_update',
        module: 'taxes',
        description: 'Permite actualizar impuestos',
      },
      {
        code: 'tax_delete',
        module: 'taxes',
        description: 'Permite eliminar impuestos',
      },

      // Permisos de Monedas
      {
        code: 'currency_module_view',
        module: 'currencies',
        description: 'Permite ver el módulo de monedas',
      },
      {
        code: 'currency_create',
        module: 'currencies',
        description: 'Permite crear monedas',
      },
      {
        code: 'currency_read',
        module: 'currencies',
        description: 'Permite leer monedas',
      },
      {
        code: 'currency_update',
        module: 'currencies',
        description: 'Permite actualizar monedas',
      },
      {
        code: 'currency_delete',
        module: 'currencies',
        description: 'Permite eliminar monedas',
      },

      // Permisos de Productos
      {
        code: 'product_module_view',
        module: 'products',
        description: 'Permite ver el módulo de productos',
      },
      {
        code: 'product_create',
        module: 'products',
        description: 'Permite crear productos',
      },
      {
        code: 'product_read',
        module: 'products',
        description: 'Permite leer productos',
      },
      {
        code: 'product_update',
        module: 'products',
        description: 'Permite actualizar productos',
      },
      {
        code: 'product_delete',
        module: 'products',
        description: 'Permite eliminar productos',
      },

      // Permisos de Inventario
      {
        code: 'inventory_module_view',
        module: 'inventory',
        description: 'Permite ver el módulo de inventario',
      },
      {
        code: 'inventory_create',
        module: 'inventory',
        description: 'Permite crear registros de inventario',
      },
      {
        code: 'inventory_read',
        module: 'inventory',
        description: 'Permite leer registros de inventario',
      },
      {
        code: 'inventory_update',
        module: 'inventory',
        description: 'Permite actualizar registros de inventario',
      },
      {
        code: 'inventory_delete',
        module: 'inventory',
        description: 'Permite eliminar registros de inventario',
      },

      // Permisos de Almacenes
      {
        code: 'warehouse_module_view',
        module: 'warehouses',
        description: 'Permite ver el módulo de almacenes',
      },
      {
        code: 'warehouse_create',
        module: 'warehouses',
        description: 'Permite crear almacenes',
      },
      {
        code: 'warehouse_read',
        module: 'warehouses',
        description: 'Permite leer almacenes',
      },
      {
        code: 'warehouse_update',
        module: 'warehouses',
        description: 'Permite actualizar almacenes',
      },
      {
        code: 'warehouse_delete',
        module: 'warehouses',
        description: 'Permite eliminar almacenes',
      },

      // Permisos de Aperturas de Almacén
      {
        code: 'warehouse_opening_module_view',
        module: 'warehouse_openings',
        description: 'Permite ver el módulo de aperturas de almacén',
      },
      {
        code: 'warehouse_opening_create',
        module: 'warehouse_openings',
        description: 'Permite crear aperturas de almacén',
      },
      {
        code: 'warehouse_opening_read',
        module: 'warehouse_openings',
        description: 'Permite leer aperturas de almacén',
      },
      {
        code: 'warehouse_opening_update',
        module: 'warehouse_openings',
        description: 'Permite actualizar aperturas de almacén',
      },
      {
        code: 'warehouse_opening_delete',
        module: 'warehouse_openings',
        description: 'Permite eliminar aperturas de almacén',
      },

      // Permisos de Recepciones
      {
        code: 'reception_module_view',
        module: 'receptions',
        description: 'Permite ver el módulo de recepciones',
      },
      {
        code: 'reception_create',
        module: 'receptions',
        description: 'Permite crear recepciones',
      },
      {
        code: 'reception_read',
        module: 'receptions',
        description: 'Permite leer recepciones',
      },
      {
        code: 'reception_update',
        module: 'receptions',
        description: 'Permite actualizar recepciones',
      },
      {
        code: 'reception_delete',
        module: 'receptions',
        description: 'Permite eliminar recepciones',
      },

      // Permisos de Detalles de Recepción
      {
        code: 'reception_detail_module_view',
        module: 'reception_details',
        description: 'Permite ver el módulo de detalles de recepción',
      },
      {
        code: 'reception_detail_create',
        module: 'reception_details',
        description: 'Permite crear detalles de recepción',
      },
      {
        code: 'reception_detail_read',
        module: 'reception_details',
        description: 'Permite leer detalles de recepción',
      },
      {
        code: 'reception_detail_update',
        module: 'reception_details',
        description: 'Permite actualizar detalles de recepción',
      },
      {
        code: 'reception_detail_delete',
        module: 'reception_details',
        description: 'Permite eliminar detalles de recepción',
      },

      // Permisos de Retiros
      {
        code: 'withdrawal_module_view',
        module: 'withdrawals',
        description: 'Permite ver el módulo de retiros',
      },
      {
        code: 'withdrawal_create',
        module: 'withdrawals',
        description: 'Permite crear retiros',
      },
      {
        code: 'withdrawal_read',
        module: 'withdrawals',
        description: 'Permite leer retiros',
      },
      {
        code: 'withdrawal_update',
        module: 'withdrawals',
        description: 'Permite actualizar retiros',
      },
      {
        code: 'withdrawal_delete',
        module: 'withdrawals',
        description: 'Permite eliminar retiros',
      },

      // Permisos de Detalles de Retiro
      {
        code: 'withdrawal_detail_module_view',
        module: 'withdrawal_details',
        description: 'Permite ver el módulo de detalles de retiro',
      },
      {
        code: 'withdrawal_detail_create',
        module: 'withdrawal_details',
        description: 'Permite crear detalles de retiro',
      },
      {
        code: 'withdrawal_detail_read',
        module: 'withdrawal_details',
        description: 'Permite leer detalles de retiro',
      },
      {
        code: 'withdrawal_detail_update',
        module: 'withdrawal_details',
        description: 'Permite actualizar detalles de retiro',
      },
      {
        code: 'withdrawal_detail_delete',
        module: 'withdrawal_details',
        description: 'Permite eliminar detalles de retiro',
      },

      // Permisos de Historial de Productos
      {
        code: 'product_history_module_view',
        module: 'product_history',
        description: 'Permite ver el módulo de historial de productos',
      },
      {
        code: 'product_history_create',
        module: 'product_history',
        description: 'Permite crear registros de historial de productos',
      },
      {
        code: 'product_history_read',
        module: 'product_history',
        description: 'Permite leer registros de historial de productos',
      },
      {
        code: 'product_history_update',
        module: 'product_history',
        description: 'Permite actualizar registros de historial de productos',
      },
      {
        code: 'product_history_delete',
        module: 'product_history',
        description: 'Permite eliminar registros de historial de productos',
      },

      // Permisos de Asignación de Roles y Permisos
      {
        code: 'role_permission_module_view',
        module: 'role_permissions',
        description: 'Permite ver el módulo de asignación de roles y permisos',
      },
      {
        code: 'role_permission_create',
        module: 'role_permissions',
        description: 'Permite crear asignaciones de roles y permisos',
      },
      {
        code: 'role_permission_read',
        module: 'role_permissions',
        description: 'Permite leer asignaciones de roles y permisos',
      },
      {
        code: 'role_permission_update',
        module: 'role_permissions',
        description: 'Permite actualizar asignaciones de roles y permisos',
      },
      {
        code: 'role_permission_delete',
        module: 'role_permissions',
        description: 'Permite eliminar asignaciones de roles y permisos',
      },
    ];

    console.log('🔐 Creating system permissions ...');

    for (const permission of permissions) {
      const existingPermission = await permissionRepository.findOne({
        where: { code: permission.code },
      });

      if (!existingPermission) {
        await permissionRepository.save(permission);
        console.log(
          `✅ Permissio create: ${permission.code} (${permission.module})`,
        );
      } else {
        console.log(
          `⏭️  Permission already exists: ${permission.code} (${permission.module})`,
        );
      }
    }

    console.log(`✅ They were created ${permissions.length} system permits`);
  }
}
