import { DataSource } from 'typeorm';
import { Permission } from '../../src/models/permission.entity';

export class PermissionsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);

    const permissions = [
      // User Permissions
      {
        code: 'user_module_view',
        module: 'users',
        description:
          'Allows viewing the users module | Permite ver el módulo de usuarios',
      },
      {
        code: 'user_create',
        module: 'users',
        description: 'Allows creating users | Permite crear usuarios',
      },
      {
        code: 'user_read',
        module: 'users',
        description: 'Allows reading users | Permite leer usuarios',
      },
      {
        code: 'user_update',
        module: 'users',
        description: 'Allows updating users | Permite actualizar usuarios',
      },
      {
        code: 'user_delete',
        module: 'users',
        description: 'Allows deleting users | Permite eliminar usuarios',
      },

      // Role Permissions
      {
        code: 'role_module_view',
        module: 'roles',
        description:
          'Allows viewing the roles module | Permite ver el módulo de roles',
      },
      {
        code: 'role_create',
        module: 'roles',
        description: 'Allows creating roles | Permite crear roles',
      },
      {
        code: 'role_read',
        module: 'roles',
        description: 'Allows reading roles | Permite leer roles',
      },
      {
        code: 'role_update',
        module: 'roles',
        description: 'Allows updating roles | Permite actualizar roles',
      },
      {
        code: 'role_delete',
        module: 'roles',
        description: 'Allows deleting roles | Permite eliminar roles',
      },

      // Permission Permissions
      {
        code: 'permission_module_view',
        module: 'permissions',
        description:
          'Allows viewing the permissions module | Permite ver el módulo de permisos',
      },
      {
        code: 'permission_create',
        module: 'permissions',
        description: 'Allows creating permissions | Permite crear permisos',
      },
      {
        code: 'permission_read',
        module: 'permissions',
        description: 'Allows reading permissions | Permite leer permisos',
      },
      {
        code: 'permission_update',
        module: 'permissions',
        description:
          'Allows updating permissions | Permite actualizar permisos',
      },
      {
        code: 'permission_delete',
        module: 'permissions',
        description: 'Allows deleting permissions | Permite eliminar permisos',
      },

      // Language Permissions
      {
        code: 'language_module_view',
        module: 'languages',
        description:
          'Allows viewing the languages module | Permite ver el módulo de idiomas',
      },
      {
        code: 'language_create',
        module: 'languages',
        description: 'Allows creating languages | Permite crear idiomas',
      },
      {
        code: 'language_read',
        module: 'languages',
        description: 'Allows reading languages | Permite leer idiomas',
      },
      {
        code: 'language_update',
        module: 'languages',
        description: 'Allows updating languages | Permite actualizar idiomas',
      },
      {
        code: 'language_delete',
        module: 'languages',
        description: 'Allows deleting languages | Permite eliminar idiomas',
      },

      // Client Permissions
      {
        code: 'client_module_view',
        module: 'clients',
        description:
          'Allows viewing the clients module | Permite ver el módulo de clientes',
      },
      {
        code: 'client_create',
        module: 'clients',
        description: 'Allows creating clients | Permite crear clientes',
      },
      {
        code: 'client_read',
        module: 'clients',
        description: 'Allows reading clients | Permite leer clientes',
      },
      {
        code: 'client_update',
        module: 'clients',
        description: 'Allows updating clients | Permite actualizar clientes',
      },
      {
        code: 'client_delete',
        module: 'clients',
        description: 'Allows deleting clients | Permite eliminar clientes',
      },

      // Provider Permissions
      {
        code: 'provider_module_view',
        module: 'providers',
        description:
          'Allows viewing the providers module | Permite ver el módulo de proveedores',
      },
      {
        code: 'provider_create',
        module: 'providers',
        description: 'Allows creating providers | Permite crear proveedores',
      },
      {
        code: 'provider_read',
        module: 'providers',
        description: 'Allows reading providers | Permite leer proveedores',
      },
      {
        code: 'provider_update',
        module: 'providers',
        description:
          'Allows updating providers | Permite actualizar proveedores',
      },
      {
        code: 'provider_delete',
        module: 'providers',
        description: 'Allows deleting providers | Permite eliminar proveedores',
      },

      // Measurement Unit Permissions
      {
        code: 'measurement_unit_module_view',
        module: 'measurement_units',
        description:
          'Allows viewing the measurement units module | Permite ver el módulo de unidades de medida',
      },
      {
        code: 'measurement_unit_create',
        module: 'measurement_units',
        description:
          'Allows creating measurement units | Permite crear unidades de medida',
      },
      {
        code: 'measurement_unit_read',
        module: 'measurement_units',
        description:
          'Allows reading measurement units | Permite leer unidades de medida',
      },
      {
        code: 'measurement_unit_update',
        module: 'measurement_units',
        description:
          'Allows updating measurement units | Permite actualizar unidades de medida',
      },
      {
        code: 'measurement_unit_delete',
        module: 'measurement_units',
        description:
          'Allows deleting measurement units | Permite eliminar unidades de medida',
      },

      // Brand Permissions
      {
        code: 'brand_module_view',
        module: 'brands',
        description:
          'Allows viewing the brands module | Permite ver el módulo de marcas',
      },
      {
        code: 'brand_create',
        module: 'brands',
        description: 'Allows creating brands | Permite crear marcas',
      },
      {
        code: 'brand_read',
        module: 'brands',
        description: 'Allows reading brands | Permite leer marcas',
      },
      {
        code: 'brand_update',
        module: 'brands',
        description: 'Allows updating brands | Permite actualizar marcas',
      },
      {
        code: 'brand_delete',
        module: 'brands',
        description: 'Allows deleting brands | Permite eliminar marcas',
      },

      // Category Permissions
      {
        code: 'category_module_view',
        module: 'categories',
        description:
          'Allows viewing the categories module | Permite ver el módulo de categorías',
      },
      {
        code: 'category_create',
        module: 'categories',
        description: 'Allows creating categories | Permite crear categorías',
      },
      {
        code: 'category_read',
        module: 'categories',
        description: 'Allows reading categories | Permite leer categorías',
      },
      {
        code: 'category_update',
        module: 'categories',
        description:
          'Allows updating categories | Permite actualizar categorías',
      },
      {
        code: 'category_delete',
        module: 'categories',
        description: 'Allows deleting categories | Permite eliminar categorías',
      },

      // Tax Permissions
      {
        code: 'tax_module_view',
        module: 'taxes',
        description:
          'Allows viewing the taxes module | Permite ver el módulo de impuestos',
      },
      {
        code: 'tax_create',
        module: 'taxes',
        description: 'Allows creating taxes | Permite crear impuestos',
      },
      {
        code: 'tax_read',
        module: 'taxes',
        description: 'Allows reading taxes | Permite leer impuestos',
      },
      {
        code: 'tax_update',
        module: 'taxes',
        description: 'Allows updating taxes | Permite actualizar impuestos',
      },
      {
        code: 'tax_delete',
        module: 'taxes',
        description: 'Allows deleting taxes | Permite eliminar impuestos',
      },

      // Currency Permissions
      {
        code: 'currency_module_view',
        module: 'currencies',
        description:
          'Allows viewing the currencies module | Permite ver el módulo de monedas',
      },
      {
        code: 'currency_create',
        module: 'currencies',
        description: 'Allows creating currencies | Permite crear monedas',
      },
      {
        code: 'currency_read',
        module: 'currencies',
        description: 'Allows reading currencies | Permite leer monedas',
      },
      {
        code: 'currency_update',
        module: 'currencies',
        description: 'Allows updating currencies | Permite actualizar monedas',
      },
      {
        code: 'currency_delete',
        module: 'currencies',
        description: 'Allows deleting currencies | Permite eliminar monedas',
      },

      // Product Permissions
      {
        code: 'product_module_view',
        module: 'products',
        description:
          'Allows viewing the products module | Permite ver el módulo de productos',
      },
      {
        code: 'product_create',
        module: 'products',
        description: 'Allows creating products | Permite crear productos',
      },
      {
        code: 'product_read',
        module: 'products',
        description: 'Allows reading products | Permite leer productos',
      },
      {
        code: 'product_update',
        module: 'products',
        description: 'Allows updating products | Permite actualizar productos',
      },
      {
        code: 'product_delete',
        module: 'products',
        description: 'Allows deleting products | Permite eliminar productos',
      },

      // Inventory Permissions
      {
        code: 'inventory_module_view',
        module: 'inventory',
        description:
          'Allows viewing the inventory module | Permite ver el módulo de inventario',
      },
      {
        code: 'inventory_create',
        module: 'inventory',
        description:
          'Allows creating inventory records | Permite crear registros de inventario',
      },
      {
        code: 'inventory_read',
        module: 'inventory',
        description:
          'Allows reading inventory records | Permite leer registros de inventario',
      },
      {
        code: 'inventory_update',
        module: 'inventory',
        description:
          'Allows updating inventory records | Permite actualizar registros de inventario',
      },
      {
        code: 'inventory_delete',
        module: 'inventory',
        description:
          'Allows deleting inventory records | Permite eliminar registros de inventario',
      },

      // Warehouse Permissions
      {
        code: 'warehouse_module_view',
        module: 'warehouses',
        description:
          'Allows viewing the warehouses module | Permite ver el módulo de almacenes',
      },
      {
        code: 'warehouse_create',
        module: 'warehouses',
        description: 'Allows creating warehouses | Permite crear almacenes',
      },
      {
        code: 'warehouse_close',
        module: 'warehouses',
        description: 'Allows close warehouses | Permite cerrar almacenes',
      },
      {
        code: 'warehouse_read',
        module: 'warehouses',
        description: 'Allows reading warehouses | Permite leer almacenes',
      },
      {
        code: 'warehouse_update',
        module: 'warehouses',
        description:
          'Allows updating warehouses | Permite actualizar almacenes',
      },
      {
        code: 'warehouse_delete',
        module: 'warehouses',
        description: 'Allows deleting warehouses | Permite eliminar almacenes',
      },

      // Warehouse Opening Permissions
      {
        code: 'warehouse_opening_module_view',
        module: 'warehouse_openings',
        description:
          'Allows viewing the warehouse openings module | Permite ver el módulo de aperturas de almacén',
      },
      {
        code: 'warehouse_opening_create',
        module: 'warehouse_openings',
        description:
          'Allows creating warehouse openings | Permite crear aperturas de almacén',
      },
      {
        code: 'warehouse_opening_read',
        module: 'warehouse_openings',
        description:
          'Allows reading warehouse openings | Permite leer aperturas de almacén',
      },
      {
        code: 'warehouse_opening_update',
        module: 'warehouse_openings',
        description:
          'Allows updating warehouse openings | Permite actualizar aperturas de almacén',
      },
      {
        code: 'warehouse_opening_delete',
        module: 'warehouse_openings',
        description:
          'Allows deleting warehouse openings | Permite eliminar aperturas de almacén',
      },

      // Reception Permissions
      {
        code: 'reception_module_view',
        module: 'receptions',
        description:
          'Allows viewing the receptions module | Permite ver el módulo de recepciones',
      },
      {
        code: 'reception_create',
        module: 'receptions',
        description: 'Allows creating receptions | Permite crear recepciones',
      },
      {
        code: 'reception_read',
        module: 'receptions',
        description: 'Allows reading receptions | Permite leer recepciones',
      },
      {
        code: 'reception_update',
        module: 'receptions',
        description:
          'Allows updating receptions | Permite actualizar recepciones',
      },
      {
        code: 'reception_delete',
        module: 'receptions',
        description:
          'Allows deleting receptions | Permite eliminar recepciones',
      },

      // Reception Detail Permissions
      {
        code: 'reception_detail_module_view',
        module: 'reception_details',
        description:
          'Allows viewing the reception details module | Permite ver el módulo de detalles de recepción',
      },
      {
        code: 'reception_detail_create',
        module: 'reception_details',
        description:
          'Allows creating reception details | Permite crear detalles de recepción',
      },
      {
        code: 'reception_detail_read',
        module: 'reception_details',
        description:
          'Allows reading reception details | Permite leer detalles de recepción',
      },
      {
        code: 'reception_detail_update',
        module: 'reception_details',
        description:
          'Allows updating reception details | Permite actualizar detalles de recepción',
      },
      {
        code: 'reception_detail_delete',
        module: 'reception_details',
        description:
          'Allows deleting reception details | Permite eliminar detalles de recepción',
      },

      // Withdrawal Permissions
      {
        code: 'withdrawal_module_view',
        module: 'withdrawals',
        description:
          'Allows viewing the withdrawals module | Permite ver el módulo de retiros',
      },
      {
        code: 'withdrawal_create',
        module: 'withdrawals',
        description: 'Allows creating withdrawals | Permite crear retiros',
      },
      {
        code: 'withdrawal_read',
        module: 'withdrawals',
        description: 'Allows reading withdrawals | Permite leer retiros',
      },
      {
        code: 'withdrawal_update',
        module: 'withdrawals',
        description: 'Allows updating withdrawals | Permite actualizar retiros',
      },
      {
        code: 'withdrawal_delete',
        module: 'withdrawals',
        description: 'Allows deleting withdrawals | Permite eliminar retiros',
      },

      // Withdrawal Detail Permissions
      {
        code: 'withdrawal_detail_module_view',
        module: 'withdrawal_details',
        description:
          'Allows viewing the withdrawal details module | Permite ver el módulo de detalles de retiro',
      },
      {
        code: 'withdrawal_detail_create',
        module: 'withdrawal_details',
        description:
          'Allows creating withdrawal details | Permite crear detalles de retiro',
      },
      {
        code: 'withdrawal_detail_read',
        module: 'withdrawal_details',
        description:
          'Allows reading withdrawal details | Permite leer detalles de retiro',
      },
      {
        code: 'withdrawal_detail_update',
        module: 'withdrawal_details',
        description:
          'Allows updating withdrawal details | Permite actualizar detalles de retiro',
      },
      {
        code: 'withdrawal_detail_delete',
        module: 'withdrawal_details',
        description:
          'Allows deleting withdrawal details | Permite eliminar detalles de retiro',
      },

      // Product History Permissions
      {
        code: 'product_history_module_view',
        module: 'product_history',
        description:
          'Allows viewing the product history module | Permite ver el módulo de historial de productos',
      },

      // Warehouse Adjustment Permissions
      {
        code: 'warehouse_adjustment_module_view',
        module: 'warehouse_adjustments',
        description:
          'Allows viewing the warehouse adjustments module | Permite ver el módulo de ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_create',
        module: 'warehouse_adjustments',
        description:
          'Allows creating warehouse adjustments | Permite crear ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_read',
        module: 'warehouse_adjustments',
        description:
          'Allows reading warehouse adjustments | Permite leer ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_update',
        module: 'warehouse_adjustments',
        description:
          'Allows updating warehouse adjustments | Permite actualizar ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_delete',
        module: 'warehouse_adjustments',
        description:
          'Allows deleting warehouse adjustments | Permite eliminar ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_process',
        module: 'warehouse_adjustments',
        description:
          'Allows processing warehouse adjustments | Permite procesar ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_detail_create',
        module: 'warehouse_adjustments',
        description:
          'Allows creating warehouse adjustment details | Permite crear detalles de ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_detail_read',
        module: 'warehouse_adjustments',
        description:
          'Allows reading warehouse adjustment details | Permite leer detalles de ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_detail_update',
        module: 'warehouse_adjustments',
        description:
          'Allows updating warehouse adjustment details | Permite actualizar detalles de ajustes entre almacenes',
      },
      {
        code: 'warehouse_adjustment_detail_delete',
        module: 'warehouse_adjustments',
        description:
          'Allows deleting warehouse adjustment details | Permite eliminar detalles de ajustes entre almacenes',
      },
      {
        code: 'product_history_create',
        module: 'product_history',
        description:
          'Allows creating product history records | Permite crear registros de historial de productos',
      },
      {
        code: 'product_history_read',
        module: 'product_history',
        description:
          'Allows reading product history records | Permite leer registros de historial de productos',
      },
      {
        code: 'product_history_update',
        module: 'product_history',
        description:
          'Allows updating product history records | Permite actualizar registros de historial de productos',
      },
      {
        code: 'product_history_delete',
        module: 'product_history',
        description:
          'Allows deleting product history records | Permite eliminar registros de historial de productos',
      },

      // Role Permission Assignment Permissions
      {
        code: 'role_permission_module_view',
        module: 'role_permissions',
        description:
          'Allows viewing the role permission assignment module | Permite ver el módulo de asignación de permisos a roles',
      },
      {
        code: 'role_permission_create',
        module: 'role_permissions',
        description:
          'Allows creating role permission assignments | Permite crear asignaciones de permisos a roles',
      },
      {
        code: 'role_permission_read',
        module: 'role_permissions',
        description:
          'Allows reading role permission assignments | Permite leer asignaciones de permisos a roles',
      },
      {
        code: 'role_permission_update',
        module: 'role_permissions',
        description:
          'Allows updating role permission assignments | Permite actualizar asignaciones de permisos a roles',
      },
      {
        code: 'role_permission_delete',
        module: 'role_permissions',
        description:
          'Allows deleting role permission assignments | Permite eliminar asignaciones de permisos a roles',
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
          `✅ Permission created: ${permission.code} (${permission.module})`,
        );
      } else {
        console.log(
          `⏭️  Permission already exists: ${permission.code} (${permission.module})`,
        );
      }
    }

    console.log(`✅ ${permissions.length} system permissions were created`);
  }
}
