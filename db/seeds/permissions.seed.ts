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
        description: 'Allows viewing the users module',
      },
      {
        code: 'user_create',
        module: 'users',
        description: 'Allows creating users',
      },
      {
        code: 'user_read',
        module: 'users',
        description: 'Allows reading users',
      },
      {
        code: 'user_update',
        module: 'users',
        description: 'Allows updating users',
      },
      {
        code: 'user_delete',
        module: 'users',
        description: 'Allows deleting users',
      },

      // Role Permissions
      {
        code: 'role_module_view',
        module: 'roles',
        description: 'Allows viewing the roles module',
      },
      {
        code: 'role_create',
        module: 'roles',
        description: 'Allows creating roles',
      },
      {
        code: 'role_read',
        module: 'roles',
        description: 'Allows reading roles',
      },
      {
        code: 'role_update',
        module: 'roles',
        description: 'Allows updating roles',
      },
      {
        code: 'role_delete',
        module: 'roles',
        description: 'Allows deleting roles',
      },

      // Permission Permissions
      {
        code: 'permission_module_view',
        module: 'permissions',
        description: 'Allows viewing the permissions module',
      },
      {
        code: 'permission_create',
        module: 'permissions',
        description: 'Allows creating permissions',
      },
      {
        code: 'permission_read',
        module: 'permissions',
        description: 'Allows reading permissions',
      },
      {
        code: 'permission_update',
        module: 'permissions',
        description: 'Allows updating permissions',
      },
      {
        code: 'permission_delete',
        module: 'permissions',
        description: 'Allows deleting permissions',
      },

      // Language Permissions
      {
        code: 'language_module_view',
        module: 'languages',
        description: 'Allows viewing the languages module',
      },
      {
        code: 'language_create',
        module: 'languages',
        description: 'Allows creating languages',
      },
      {
        code: 'language_read',
        module: 'languages',
        description: 'Allows reading languages',
      },
      {
        code: 'language_update',
        module: 'languages',
        description: 'Allows updating languages',
      },
      {
        code: 'language_delete',
        module: 'languages',
        description: 'Allows deleting languages',
      },

      // Client Permissions
      {
        code: 'client_module_view',
        module: 'clients',
        description: 'Allows viewing the clients module',
      },
      {
        code: 'client_create',
        module: 'clients',
        description: 'Allows creating clients',
      },
      {
        code: 'client_read',
        module: 'clients',
        description: 'Allows reading clients',
      },
      {
        code: 'client_update',
        module: 'clients',
        description: 'Allows updating clients',
      },
      {
        code: 'client_delete',
        module: 'clients',
        description: 'Allows deleting clients',
      },

      // Provider Permissions
      {
        code: 'provider_module_view',
        module: 'providers',
        description: 'Allows viewing the providers module',
      },
      {
        code: 'provider_create',
        module: 'providers',
        description: 'Allows creating providers',
      },
      {
        code: 'provider_read',
        module: 'providers',
        description: 'Allows reading providers',
      },
      {
        code: 'provider_update',
        module: 'providers',
        description: 'Allows updating providers',
      },
      {
        code: 'provider_delete',
        module: 'providers',
        description: 'Allows deleting providers',
      },

      // Measurement Unit Permissions
      {
        code: 'measurement_unit_module_view',
        module: 'measurement_units',
        description: 'Allows viewing the measurement units module',
      },
      {
        code: 'measurement_unit_create',
        module: 'measurement_units',
        description: 'Allows creating measurement units',
      },
      {
        code: 'measurement_unit_read',
        module: 'measurement_units',
        description: 'Allows reading measurement units',
      },
      {
        code: 'measurement_unit_update',
        module: 'measurement_units',
        description: 'Allows updating measurement units',
      },
      {
        code: 'measurement_unit_delete',
        module: 'measurement_units',
        description: 'Allows deleting measurement units',
      },

      // Brand Permissions
      {
        code: 'brand_module_view',
        module: 'brands',
        description: 'Allows viewing the brands module',
      },
      {
        code: 'brand_create',
        module: 'brands',
        description: 'Allows creating brands',
      },
      {
        code: 'brand_read',
        module: 'brands',
        description: 'Allows reading brands',
      },
      {
        code: 'brand_update',
        module: 'brands',
        description: 'Allows updating brands',
      },
      {
        code: 'brand_delete',
        module: 'brands',
        description: 'Allows deleting brands',
      },

      // Category Permissions
      {
        code: 'category_module_view',
        module: 'categories',
        description: 'Allows viewing the categories module',
      },
      {
        code: 'category_create',
        module: 'categories',
        description: 'Allows creating categories',
      },
      {
        code: 'category_read',
        module: 'categories',
        description: 'Allows reading categories',
      },
      {
        code: 'category_update',
        module: 'categories',
        description: 'Allows updating categories',
      },
      {
        code: 'category_delete',
        module: 'categories',
        description: 'Allows deleting categories',
      },

      // Tax Permissions
      {
        code: 'tax_module_view',
        module: 'taxes',
        description: 'Allows viewing the taxes module',
      },
      {
        code: 'tax_create',
        module: 'taxes',
        description: 'Allows creating taxes',
      },
      {
        code: 'tax_read',
        module: 'taxes',
        description: 'Allows reading taxes',
      },
      {
        code: 'tax_update',
        module: 'taxes',
        description: 'Allows updating taxes',
      },
      {
        code: 'tax_delete',
        module: 'taxes',
        description: 'Allows deleting taxes',
      },

      // Currency Permissions
      {
        code: 'currency_module_view',
        module: 'currencies',
        description: 'Allows viewing the currencies module',
      },
      {
        code: 'currency_create',
        module: 'currencies',
        description: 'Allows creating currencies',
      },
      {
        code: 'currency_read',
        module: 'currencies',
        description: 'Allows reading currencies',
      },
      {
        code: 'currency_update',
        module: 'currencies',
        description: 'Allows updating currencies',
      },
      {
        code: 'currency_delete',
        module: 'currencies',
        description: 'Allows deleting currencies',
      },

      // Product Permissions
      {
        code: 'product_module_view',
        module: 'products',
        description: 'Allows viewing the products module',
      },
      {
        code: 'product_create',
        module: 'products',
        description: 'Allows creating products',
      },
      {
        code: 'product_read',
        module: 'products',
        description: 'Allows reading products',
      },
      {
        code: 'product_update',
        module: 'products',
        description: 'Allows updating products',
      },
      {
        code: 'product_delete',
        module: 'products',
        description: 'Allows deleting products',
      },

      // Inventory Permissions
      {
        code: 'inventory_module_view',
        module: 'inventory',
        description: 'Allows viewing the inventory module',
      },
      {
        code: 'inventory_create',
        module: 'inventory',
        description: 'Allows creating inventory records',
      },
      {
        code: 'inventory_read',
        module: 'inventory',
        description: 'Allows reading inventory records',
      },
      {
        code: 'inventory_update',
        module: 'inventory',
        description: 'Allows updating inventory records',
      },
      {
        code: 'inventory_delete',
        module: 'inventory',
        description: 'Allows deleting inventory records',
      },

      // Warehouse Permissions
      {
        code: 'warehouse_module_view',
        module: 'warehouses',
        description: 'Allows viewing the warehouses module',
      },
      {
        code: 'warehouse_create',
        module: 'warehouses',
        description: 'Allows creating warehouses',
      },
      {
        code: 'warehouse_read',
        module: 'warehouses',
        description: 'Allows reading warehouses',
      },
      {
        code: 'warehouse_update',
        module: 'warehouses',
        description: 'Allows updating warehouses',
      },
      {
        code: 'warehouse_delete',
        module: 'warehouses',
        description: 'Allows deleting warehouses',
      },

      // Warehouse Opening Permissions
      {
        code: 'warehouse_opening_module_view',
        module: 'warehouse_openings',
        description: 'Allows viewing the warehouse openings module',
      },
      {
        code: 'warehouse_opening_create',
        module: 'warehouse_openings',
        description: 'Allows creating warehouse openings',
      },
      {
        code: 'warehouse_opening_read',
        module: 'warehouse_openings',
        description: 'Allows reading warehouse openings',
      },
      {
        code: 'warehouse_opening_update',
        module: 'warehouse_openings',
        description: 'Allows updating warehouse openings',
      },
      {
        code: 'warehouse_opening_delete',
        module: 'warehouse_openings',
        description: 'Allows deleting warehouse openings',
      },

      // Reception Permissions
      {
        code: 'reception_module_view',
        module: 'receptions',
        description: 'Allows viewing the receptions module',
      },
      {
        code: 'reception_create',
        module: 'receptions',
        description: 'Allows creating receptions',
      },
      {
        code: 'reception_read',
        module: 'receptions',
        description: 'Allows reading receptions',
      },
      {
        code: 'reception_update',
        module: 'receptions',
        description: 'Allows updating receptions',
      },
      {
        code: 'reception_delete',
        module: 'receptions',
        description: 'Allows deleting receptions',
      },

      // Reception Detail Permissions
      {
        code: 'reception_detail_module_view',
        module: 'reception_details',
        description: 'Allows viewing the reception details module',
      },
      {
        code: 'reception_detail_create',
        module: 'reception_details',
        description: 'Allows creating reception details',
      },
      {
        code: 'reception_detail_read',
        module: 'reception_details',
        description: 'Allows reading reception details',
      },
      {
        code: 'reception_detail_update',
        module: 'reception_details',
        description: 'Allows updating reception details',
      },
      {
        code: 'reception_detail_delete',
        module: 'reception_details',
        description: 'Allows deleting reception details',
      },

      // Withdrawal Permissions
      {
        code: 'withdrawal_module_view',
        module: 'withdrawals',
        description: 'Allows viewing the withdrawals module',
      },
      {
        code: 'withdrawal_create',
        module: 'withdrawals',
        description: 'Allows creating withdrawals',
      },
      {
        code: 'withdrawal_read',
        module: 'withdrawals',
        description: 'Allows reading withdrawals',
      },
      {
        code: 'withdrawal_update',
        module: 'withdrawals',
        description: 'Allows updating withdrawals',
      },
      {
        code: 'withdrawal_delete',
        module: 'withdrawals',
        description: 'Allows deleting withdrawals',
      },

      // Withdrawal Detail Permissions
      {
        code: 'withdrawal_detail_module_view',
        module: 'withdrawal_details',
        description: 'Allows viewing the withdrawal details module',
      },
      {
        code: 'withdrawal_detail_create',
        module: 'withdrawal_details',
        description: 'Allows creating withdrawal details',
      },
      {
        code: 'withdrawal_detail_read',
        module: 'withdrawal_details',
        description: 'Allows reading withdrawal details',
      },
      {
        code: 'withdrawal_detail_update',
        module: 'withdrawal_details',
        description: 'Allows updating withdrawal details',
      },
      {
        code: 'withdrawal_detail_delete',
        module: 'withdrawal_details',
        description: 'Allows deleting withdrawal details',
      },

      // Product History Permissions
      {
        code: 'product_history_module_view',
        module: 'product_history',
        description: 'Allows viewing the product history module',
      },
      {
        code: 'product_history_create',
        module: 'product_history',
        description: 'Allows creating product history records',
      },
      {
        code: 'product_history_read',
        module: 'product_history',
        description: 'Allows reading product history records',
      },
      {
        code: 'product_history_update',
        module: 'product_history',
        description: 'Allows updating product history records',
      },
      {
        code: 'product_history_delete',
        module: 'product_history',
        description: 'Allows deleting product history records',
      },

      // Role Permission Assignment Permissions
      {
        code: 'role_permission_module_view',
        module: 'role_permissions',
        description: 'Allows viewing the role permission assignment module',
      },
      {
        code: 'role_permission_create',
        module: 'role_permissions',
        description: 'Allows creating role permission assignments',
      },
      {
        code: 'role_permission_read',
        module: 'role_permissions',
        description: 'Allows reading role permission assignments',
      },
      {
        code: 'role_permission_update',
        module: 'role_permissions',
        description: 'Allows updating role permission assignments',
      },
      {
        code: 'role_permission_delete',
        module: 'role_permissions',
        description: 'Allows deleting role permission assignments',
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
