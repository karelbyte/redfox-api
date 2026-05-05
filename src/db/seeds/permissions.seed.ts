import { DataSource } from 'typeorm';
import { Permission } from '../../models/permission.entity';

export class PermissionsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);

    const permissions = [
       {
        code: 'user_module_view',
        module: 'users',
        description:
          'Allows viewing the users module | Permite ver el módulo de usuarios | 允许查看用户模块',
      },
      {
        code: 'user_create',
        module: 'users',
        description: 'Allows creating users | Permite crear usuarios | 允许创建用户',
      },
      {
        code: 'user_read',
        module: 'users',
        description: 'Allows reading users | Permite leer usuarios | 允许读取用户',
      },
      {
        code: 'user_update',
        module: 'users',
        description: 'Allows updating users | Permite actualizar usuarios | 允许更新用户',
      },
      {
        code: 'user_delete',
        module: 'users',
        description: 'Allows deleting users | Permite eliminar usuarios | 允许删除用户',
      },

      // Role Permissions
      {
        code: 'role_module_view',
        module: 'roles',
        description:
          'Allows viewing the roles module | Permite ver el módulo de roles | 允许查看角色模块',
      },
      {
        code: 'role_create',
        module: 'roles',
        description: 'Allows creating roles | Permite crear roles | 允许创建角色',
      },
      {
        code: 'role_read',
        module: 'roles',
        description: 'Allows reading roles | Permite leer roles | 允许读取角色',
      },
      {
        code: 'role_update',
        module: 'roles',
        description: 'Allows updating roles | Permite actualizar roles | 允许更新角色',
      },
      {
        code: 'role_delete',
        module: 'roles',
        description: 'Allows deleting roles | Permite eliminar roles | 允许删除角色',
      },

      // Permission Permissions
      {
        code: 'permission_module_view',
        module: 'permissions',
        description:
          'Allows viewing the permissions module | Permite ver el módulo de permisos | 允许查看权限模块',
      },
      {
        code: 'permission_create',
        module: 'permissions',
        description: 'Allows creating permissions | Permite crear permisos | 允许创建权限',
      },
      {
        code: 'permission_read',
        module: 'permissions',
        description: 'Allows reading permissions | Permite leer permisos | 允许读取权限',
      },
      {
        code: 'permission_update',
        module: 'permissions',
        description:
          'Allows updating permissions | Permite actualizar permisos | 允许更新权限',
      },
      {
        code: 'permission_delete',
        module: 'permissions',
        description: 'Allows deleting permissions | Permite eliminar permisos | 允许删除权限',
      },

      // Language Permissions
      {
        code: 'language_module_view',
        module: 'languages',
        description:
          'Allows viewing the languages module | Permite ver el módulo de idiomas | 允许查看语言模块',
      },
      {
        code: 'language_create',
        module: 'languages',
        description: 'Allows creating languages | Permite crear idiomas | 允许创建语言',
      },
      {
        code: 'language_read',
        module: 'languages',
        description: 'Allows reading languages | Permite leer idiomas | 允许读取语言',
      },
      {
        code: 'language_update',
        module: 'languages',
        description: 'Allows updating languages | Permite actualizar idiomas | 允许更新语言',
      },
      {
        code: 'language_delete',
        module: 'languages',
        description: 'Allows deleting languages | Permite eliminar idiomas | 允许删除语言',
      },

      // Client Permissions
      {
        code: 'client_module_view',
        module: 'clients',
        description:
          'Allows viewing the clients module | Permite ver el módulo de clientes | 允许查看客户模块',
      },
      {
        code: 'client_create',
        module: 'clients',
        description: 'Allows creating clients | Permite crear clientes | 允许创建客户',
      },
      {
        code: 'client_read',
        module: 'clients',
        description: 'Allows reading clients | Permite leer clientes | 允许读取客户',
      },
      {
        code: 'client_update',
        module: 'clients',
        description: 'Allows updating clients | Permite actualizar clientes | 允许更新客户',
      },
      {
        code: 'client_delete',
        module: 'clients',
        description: 'Allows deleting clients | Permite eliminar clientes | 允许删除客户',
      },
      {
        code: 'client_import_from_pack',
        module: 'clients',
        description: 'Allows importing clients from pack | Permite importar clientes del pack | 允许从套餐导入客户',
      },
      {
        code: 'client_import_csv',
        module: 'clients',
        description: 'Allows importing clients from CSV | Permite importar clientes desde CSV | 允许从 CSV 导入客户',
      },

      // Provider Permissions
      {
        code: 'provider_module_view',
        module: 'providers',
        description:
          'Allows viewing the providers module | Permite ver el módulo de proveedores | 允许查看供应商模块',
      },
      {
        code: 'provider_create',
        module: 'providers',
        description: 'Allows creating providers | Permite crear proveedores | 允许创建供应商',
      },
      {
        code: 'provider_read',
        module: 'providers',
        description: 'Allows reading providers | Permite leer proveedores | 允许读取供应商',
      },
      {
        code: 'provider_update',
        module: 'providers',
        description:
          'Allows updating providers | Permite actualizar proveedores | 允许更新供应商',
      },
      {
        code: 'provider_delete',
        module: 'providers',
        description: 'Allows deleting providers | Permite eliminar proveedores | 允许删除供应商',
      },

      // Measurement Unit Permissions
      {
        code: 'measurement_unit_module_view',
        module: 'measurement_units',
        description:
          'Allows viewing the measurement units module | Permite ver el módulo de unidades de medida | 允许查看计量单位模块',
      },
      {
        code: 'measurement_unit_create',
        module: 'measurement_units',
        description:
          'Allows creating measurement units | Permite crear unidades de medida | 允许创建计量单位',
      },
      {
        code: 'measurement_unit_read',
        module: 'measurement_units',
        description:
          'Allows reading measurement units | Permite leer unidades de medida | 允许读取计量单位',
      },
      {
        code: 'measurement_unit_update',
        module: 'measurement_units',
        description:
          'Allows updating measurement units | Permite actualizar unidades de medida | 允许更新计量单位',
      },
      {
        code: 'measurement_unit_delete',
        module: 'measurement_units',
        description:
          'Allows deleting measurement units | Permite eliminar unidades de medida | 允许删除计量单位',
      },

      // Brand Permissions
      {
        code: 'brand_module_view',
        module: 'brands',
        description:
          'Allows viewing the brands module | Permite ver el módulo de marcas | 允许查看品牌模块',
      },
      {
        code: 'brand_create',
        module: 'brands',
        description: 'Allows creating brands | Permite crear marcas | 允许创建品牌',
      },
      {
        code: 'brand_read',
        module: 'brands',
        description: 'Allows reading brands | Permite leer marcas | 允许读取品牌',
      },
      {
        code: 'brand_update',
        module: 'brands',
        description: 'Allows updating brands | Permite actualizar marcas | 允许更新品牌',
      },
      {
        code: 'brand_delete',
        module: 'brands',
        description: 'Allows deleting brands | Permite eliminar marcas | 允许删除品牌',
      },

      // Category Permissions
      {
        code: 'category_module_view',
        module: 'categories',
        description:
          'Allows viewing the categories module | Permite ver el módulo de categorías | 允许查看类别模块',
      },
      {
        code: 'category_create',
        module: 'categories',
        description: 'Allows creating categories | Permite crear categorías | 允许创建类别',
      },
      {
        code: 'category_read',
        module: 'categories',
        description: 'Allows reading categories | Permite leer categorías | 允许读取类别',
      },
      {
        code: 'category_update',
        module: 'categories',
        description:
          'Allows updating categories | Permite actualizar categorías | 允许更新类别',
      },
      {
        code: 'category_delete',
        module: 'categories',
        description: 'Allows deleting categories | Permite eliminar categorías | 允许删除类别',
      },

      // Tax Permissions
      {
        code: 'tax_module_view',
        module: 'taxes',
        description:
          'Allows viewing the taxes module | Permite ver el módulo de impuestos | 允许查看税收模块',
      },
      {
        code: 'tax_create',
        module: 'taxes',
        description: 'Allows creating taxes | Permite crear impuestos | 允许创建税收',
      },
      {
        code: 'tax_read',
        module: 'taxes',
        description: 'Allows reading taxes | Permite leer impuestos | 允许读取税收',
      },
      {
        code: 'tax_update',
        module: 'taxes',
        description: 'Allows updating taxes | Permite actualizar impuestos | 允许更新税收',
      },
      {
        code: 'tax_delete',
        module: 'taxes',
        description: 'Allows deleting taxes | Permite eliminar impuestos | 允许删除税收',
      },

      // Currency Permissions
      {
        code: 'currency_module_view',
        module: 'currencies',
        description:
          'Allows viewing the currencies module | Permite ver el módulo de monedas | 允许查看货币模块',
      },
      {
        code: 'currency_create',
        module: 'currencies',
        description: 'Allows creating currencies | Permite crear monedas | 允许创建货币',
      },
      {
        code: 'currency_read',
        module: 'currencies',
        description: 'Allows reading currencies | Permite leer monedas | 允许读取货币',
      },
      {
        code: 'currency_update',
        module: 'currencies',
        description: 'Allows updating currencies | Permite actualizar monedas | 允许更新货币',
      },
      {
        code: 'currency_delete',
        module: 'currencies',
        description: 'Allows deleting currencies | Permite eliminar monedas | 允许删除货币',
      },

      // Product Permissions
      {
        code: 'product_module_view',
        module: 'products',
        description:
          'Allows viewing the products module | Permite ver el módulo de productos | 允许查看产品模块',
      },
      {
        code: 'product_create',
        module: 'products',
        description: 'Allows creating products | Permite crear productos | 允许创建产品',
      },
      {
        code: 'product_read',
        module: 'products',
        description: 'Allows reading products | Permite leer productos | 允许读取产品',
      },
      {
        code: 'product_update',
        module: 'products',
        description: 'Allows updating products | Permite actualizar productos | 允许更新产品',
      },
      {
        code: 'product_delete',
        module: 'products',
        description: 'Allows deleting products | Permite eliminar productos | 允许删除产品',
      },
      {
        code: 'product_import_from_pack',
        module: 'products',
        description: 'Allows importing products from pack | Permite importar productos del pack | 允许从套餐导入产品',
      },
      {
        code: 'product_import_csv',
        module: 'products',
        description: 'Allows importing products from CSV | Permite importar productos desde CSV | 允许从 CSV 导入产品',
      },

      // Inventory Permissions
      {
        code: 'inventory_module_view',
        module: 'inventory',
        description:
          'Allows viewing the inventory module | Permite ver el módulo de inventario | 允许查看库存模块',
      },
      {
        code: 'inventory_create',
        module: 'inventory',
        description:
          'Allows creating inventory records | Permite crear registros de inventario | 允许创建库存记录',
      },
      {
        code: 'inventory_read',
        module: 'inventory',
        description:
          'Allows reading inventory records | Permite leer registros de inventario | 允许读取库存记录',
      },
      {
        code: 'inventory_update',
        module: 'inventory',
        description:
          'Allows updating inventory records | Permite actualizar registros de inventario | 允许更新库存记录',
      },
      {
        code: 'inventory_delete',
        module: 'inventory',
        description:
          'Allows deleting inventory records | Permite eliminar registros de inventario | 允许删除库存记录',
      },

      // Warehouse Permissions
      {
        code: 'warehouse_module_view',
        module: 'warehouses',
        description:
          'Allows viewing the warehouses module | Permite ver el módulo de almacenes | 允许查看仓库模块',
      },
      {
        code: 'warehouse_create',
        module: 'warehouses',
        description: 'Allows creating warehouses | Permite crear almacenes | 允许创建仓库',
      },
      {
        code: 'warehouse_close',
        module: 'warehouses',
        description: 'Allows close warehouses | Permite cerrar almacenes | 允许关闭仓库',
      },
      {
        code: 'warehouse_read',
        module: 'warehouses',
        description: 'Allows reading warehouses | Permite leer almacenes | 允许读取仓库',
      },
      {
        code: 'warehouse_update',
        module: 'warehouses',
        description:
          'Allows updating warehouses | Permite actualizar almacenes | 允许更新仓库',
      },
      {
        code: 'warehouse_delete',
        module: 'warehouses',
        description: 'Allows deleting warehouses | Permite eliminar almacenes | 允许删除仓库',
      },

      // Warehouse Opening Permissions
      {
        code: 'warehouse_opening_module_view',
        module: 'warehouse_openings',
        description:
          'Allows viewing the warehouse openings module | Permite ver el módulo de aperturas de almacén | 允许查看仓库开业模块',
      },
      {
        code: 'warehouse_opening_create',
        module: 'warehouse_openings',
        description:
          'Allows creating warehouse openings | Permite crear aperturas de almacén | 允许创建仓库开业',
      },
      {
        code: 'warehouse_opening_read',
        module: 'warehouse_openings',
        description:
          'Allows reading warehouse openings | Permite leer aperturas de almacén | 允许读取仓库开业',
      },
      {
        code: 'warehouse_opening_update',
        module: 'warehouse_openings',
        description:
          'Allows updating warehouse openings | Permite actualizar aperturas de almacén | 允许更新仓库开业',
      },
      {
        code: 'warehouse_opening_delete',
        module: 'warehouse_openings',
        description:
          'Allows deleting warehouse openings | Permite eliminar aperturas de almacén | 允许删除仓库开业',
      },

      // Reception Permissions
      {
        code: 'reception_module_view',
        module: 'receptions',
        description:
          'Allows viewing the receptions module | Permite ver el módulo de recepciones | 允许查看接收模块',
      },
      {
        code: 'reception_create',
        module: 'receptions',
        description: 'Allows creating receptions | Permite crear recepciones | 允许创建接收',
      },
      {
        code: 'reception_read',
        module: 'receptions',
        description: 'Allows reading receptions | Permite leer recepciones | 允许读取接收',
      },
      {
        code: 'reception_update',
        module: 'receptions',
        description:
          'Allows updating receptions | Permite actualizar recepciones | 允许更新接收',
      },
      {
        code: 'reception_delete',
        module: 'receptions',
        description:
          'Allows deleting receptions | Permite eliminar recepciones | 允许删除接收',
      },

      // Reception Detail Permissions
      {
        code: 'reception_detail_module_view',
        module: 'reception_details',
        description:
          'Allows viewing the reception details module | Permite ver el módulo de detalles de recepción | 允许查看接收详情模块',
      },
      {
        code: 'reception_detail_create',
        module: 'reception_details',
        description:
          'Allows creating reception details | Permite crear detalles de recepción | 允许创建接收详情',
      },
      {
        code: 'reception_detail_read',
        module: 'reception_details',
        description:
          'Allows reading reception details | Permite leer detalles de recepción | 允许读取接收详情',
      },
      {
        code: 'reception_detail_update',
        module: 'reception_details',
        description:
          'Allows updating reception details | Permite actualizar detalles de recepción | 允许更新接收详情',
      },
      {
        code: 'reception_detail_delete',
        module: 'reception_details',
        description:
          'Allows deleting reception details | Permite eliminar detalles de recepción | 允许删除接收详情',
      },

      // Withdrawal Permissions
      {
        code: 'withdrawal_module_view',
        module: 'withdrawals',
        description:
          'Allows viewing the withdrawals module | Permite ver el módulo de retiros | 允许查看提取模块',
      },
      {
        code: 'withdrawal_create',
        module: 'withdrawals',
        description: 'Allows creating withdrawals | Permite crear retiros | 允许创建提取',
      },
      {
        code: 'withdrawal_read',
        module: 'withdrawals',
        description: 'Allows reading withdrawals | Permite leer retiros | 允许读取提取',
      },
      {
        code: 'withdrawal_update',
        module: 'withdrawals',
        description: 'Allows updating withdrawals | Permite actualizar retiros | 允许更新提取',
      },
      {
        code: 'withdrawal_delete',
        module: 'withdrawals',
        description: 'Allows deleting withdrawals | Permite eliminar retiros | 允许删除提取',
      },

      // Withdrawal Detail Permissions
      {
        code: 'withdrawal_detail_module_view',
        module: 'withdrawal_details',
        description:
          'Allows viewing the withdrawal details module | Permite ver el módulo de detalles de retiro | 允许查看提取详情模块',
      },
      {
        code: 'withdrawal_detail_create',
        module: 'withdrawal_details',
        description:
          'Allows creating withdrawal details | Permite crear detalles de retiro | 允许创建提取详情',
      },
      {
        code: 'withdrawal_detail_read',
        module: 'withdrawal_details',
        description:
          'Allows reading withdrawal details | Permite leer detalles de retiro | 允许读取提取详情',
      },
      {
        code: 'withdrawal_detail_update',
        module: 'withdrawal_details',
        description:
          'Allows updating withdrawal details | Permite actualizar detalles de retiro | 允许更新提取详情',
      },
      {
        code: 'withdrawal_detail_delete',
        module: 'withdrawal_details',
        description:
          'Allows deleting withdrawal details | Permite eliminar detalles de retiro | 允许删除提取详情',
      },

      // Product History Permissions
      {
        code: 'product_history_module_view',
        module: 'product_history',
        description:
          'Allows viewing the product history module | Permite ver el módulo de historial de productos | 允许查看产品历史模块',
      },

      // Warehouse Adjustment Permissions
      {
        code: 'warehouse_adjustment_module_view',
        module: 'warehouse_adjustments',
        description:
          'Allows viewing the warehouse adjustments module | Permite ver el módulo de ajustes entre almacenes | 允许查看仓库调整模块',
      },
      {
        code: 'warehouse_adjustment_create',
        module: 'warehouse_adjustments',
        description:
          'Allows creating warehouse adjustments | Permite crear ajustes entre almacenes | 允许创建仓库调整',
      },
      {
        code: 'warehouse_adjustment_read',
        module: 'warehouse_adjustments',
        description:
          'Allows reading warehouse adjustments | Permite leer ajustes entre almacenes | 允许读取仓库调整',
      },
      {
        code: 'warehouse_adjustment_update',
        module: 'warehouse_adjustments',
        description:
          'Allows updating warehouse adjustments | Permite actualizar ajustes entre almacenes | 允许更新仓库调整',
      },
      {
        code: 'warehouse_adjustment_delete',
        module: 'warehouse_adjustments',
        description:
          'Allows deleting warehouse adjustments | Permite eliminar ajustes entre almacenes | 允许删除仓库调整',
      },
      {
        code: 'warehouse_adjustment_process',
        module: 'warehouse_adjustments',
        description:
          'Allows processing warehouse adjustments | Permite procesar ajustes entre almacenes | 允许处理仓库调整',
      },
      {
        code: 'warehouse_adjustment_detail_create',
        module: 'warehouse_adjustments',
        description:
          'Allows creating warehouse adjustment details | Permite crear detalles de ajustes entre almacenes | 允许创建仓库调整详情',
      },
      {
        code: 'warehouse_adjustment_detail_read',
        module: 'warehouse_adjustments',
        description:
          'Allows reading warehouse adjustment details | Permite leer detalles de ajustes entre almacenes | 允许读取仓库调整详情',
      },
      {
        code: 'warehouse_adjustment_detail_update',
        module: 'warehouse_adjustments',
        description:
          'Allows updating warehouse adjustment details | Permite actualizar detalles de ajustes entre almacenes | 允许更新仓库调整详情',
      },
      {
        code: 'warehouse_adjustment_detail_delete',
        module: 'warehouse_adjustments',
        description:
          'Allows deleting warehouse adjustment details | Permite eliminar detalles de ajustes entre almacenes | 允许删除仓库调整详情',
      },

      // Return Permissions
      {
        code: 'return_module_view',
        module: 'returns',
        description:
          'Allows viewing the returns module | Permite ver el módulo de devoluciones | 允许查看退货模块',
      },
      {
        code: 'return_create',
        module: 'returns',
        description: 'Allows creating returns | Permite crear devoluciones | 允许创建退货',
      },
      {
        code: 'return_read',
        module: 'returns',
        description: 'Allows reading returns | Permite leer devoluciones | 允许读取退货',
      },
      {
        code: 'return_update',
        module: 'returns',
        description:
          'Allows updating returns | Permite actualizar devoluciones | 允许更新退货',
      },
      {
        code: 'return_delete',
        module: 'returns',
        description: 'Allows deleting returns | Permite eliminar devoluciones | 允许删除退货',
      },
      {
        code: 'return_process',
        module: 'returns',
        description:
          'Allows processing returns | Permite procesar devoluciones | 允许处理退货',
      },
      {
        code: 'return_detail_create',
        module: 'returns',
        description:
          'Allows creating return details | Permite crear detalles de devoluciones | 允许创建退货详情',
      },
      {
        code: 'return_detail_read',
        module: 'returns',
        description:
          'Allows reading return details | Permite leer detalles de devoluciones | 允许读取退货详情',
      },
      {
        code: 'return_detail_update',
        module: 'returns',
        description:
          'Allows updating return details | Permite actualizar detalles de devoluciones | 允许更新退货详情',
      },
      {
        code: 'return_detail_delete',
        module: 'returns',
        description:
          'Allows deleting return details | Permite eliminar detalles de devoluciones | 允许删除退货详情',
      },
      {
        code: 'product_history_create',
        module: 'product_history',
        description:
          'Allows creating product history records | Permite crear registros de historial de productos | 允许创建产品历史记录',
      },
      {
        code: 'product_history_read',
        module: 'product_history',
        description:
          'Allows reading product history records | Permite leer registros de historial de productos | 允许读取产品历史记录',
      },
      {
        code: 'product_history_update',
        module: 'product_history',
        description:
          'Allows updating product history records | Permite actualizar registros de historial de productos | 允许更新产品历史记录',
      },
      {
        code: 'product_history_delete',
        module: 'product_history',
        description:
          'Allows deleting product history records | Permite eliminar registros de historial de productos | 允许删除产品历史记录',
      },

      // Role Permission Assignment Permissions
      {
        code: 'role_permission_module_view',
        module: 'role_permissions',
        description:
          'Allows viewing the role permission assignment module | Permite ver el módulo de asignación de permisos a roles | 允许查看角色权限分配模块',
      },
      {
        code: 'role_permission_create',
        module: 'role_permissions',
        description:
          'Allows creating role permission assignments | Permite crear asignaciones de permisos a roles | 允许创建角色权限分配',
      },
      {
        code: 'role_permission_read',
        module: 'role_permissions',
        description:
          'Allows reading role permission assignments | Permite leer asignaciones de permisos a roles | 允许读取角色权限分配',
      },
      {
        code: 'role_permission_update',
        module: 'role_permissions',
        description:
          'Allows updating role permission assignments | Permite actualizar asignaciones de permisos a roles | 允许更新角色权限分配',
      },
      {
        code: 'role_permission_delete',
        module: 'role_permissions',
        description:
          'Allows deleting role permission assignments | Permite eliminar asignaciones de permisos a roles | 允许删除角色权限分配',
      },

      // Purchase Order Permissions
      {
        code: 'purchase_order_module_view',
        module: 'purchase_orders',
        description:
          'Allows viewing the purchase orders module | Permite ver el módulo de órdenes de compra | 允许查看采购订单模块',
      },
      {
        code: 'purchase_order_create',
        module: 'purchase_orders',
        description:
          'Allows creating purchase orders | Permite crear órdenes de compra | 允许创建采购订单',
      },
      {
        code: 'purchase_order_read',
        module: 'purchase_orders',
        description:
          'Allows reading purchase orders | Permite leer órdenes de compra | 允许读取采购订单',
      },
      {
        code: 'purchase_order_update',
        module: 'purchase_orders',
        description:
          'Allows updating purchase orders | Permite actualizar órdenes de compra | 允许更新采购订单',
      },
      {
        code: 'purchase_order_delete',
        module: 'purchase_orders',
        description:
          'Allows deleting purchase orders | Permite eliminar órdenes de compra | 允许删除采购订单',
      },
      {
        code: 'purchase_order_approve',
        module: 'purchase_orders',
        description:
          'Allows approving purchase orders | Permite aprobar órdenes de compra | 允许批准采购订单',
      },
      {
        code: 'purchase_order_reject',
        module: 'purchase_orders',
        description:
          'Allows rejecting purchase orders | Permite rechazar órdenes de compra | 允许拒绝采购订单',
      },
      {
        code: 'purchase_order_cancel',
        module: 'purchase_orders',
        description:
          'Allows cancelling purchase orders | Permite cancelar órdenes de compra | 允许取消采购订单',
      },

      // Purchase Order Detail Permissions
      {
        code: 'purchase_order_detail_module_view',
        module: 'purchase_order_details',
        description:
          'Allows viewing the purchase order details module | Permite ver el módulo de detalles de órdenes de compra | 允许查看采购订单详情模块',
      },
      {
        code: 'purchase_order_detail_create',
        module: 'purchase_order_details',
        description:
          'Allows creating purchase order details | Permite crear detalles de órdenes de compra | 允许创建采购订单详情',
      },
      {
        code: 'purchase_order_detail_read',
        module: 'purchase_order_details',
        description:
          'Allows reading purchase order details | Permite leer detalles de órdenes de compra | 允许读取采购订单详情',
      },
      {
        code: 'purchase_order_detail_update',
        module: 'purchase_order_details',
        description:
          'Allows updating purchase order details | Permite actualizar detalles de órdenes de compra | 允许更新采购订单详情',
      },
      {
        code: 'purchase_order_detail_delete',
        module: 'purchase_order_details',
        description:
          'Allows deleting purchase order details | Permite eliminar detalles de órdenes de compra | 允许删除采购订单详情',
      },

      // Invoice Permissions
      {
        code: 'invoice_module_view',
        module: 'invoices',
        description:
          'Allows viewing the invoices module | Permite ver el módulo de facturas | 允许查看发票模块',
      },
      {
        code: 'invoice_create',
        module: 'invoices',
        description: 'Allows creating invoices | Permite crear facturas | 允许创建发票',
      },
      {
        code: 'invoice_read',
        module: 'invoices',
        description: 'Allows reading invoices | Permite leer facturas | 允许读取发票',
      },
      {
        code: 'invoice_update',
        module: 'invoices',
        description: 'Allows updating invoices | Permite actualizar facturas | 允许更新发票',
      },
      {
        code: 'invoice_delete',
        module: 'invoices',
        description: 'Allows deleting invoices | Permite eliminar facturas | 允许删除发票',
      },
      {
        code: 'invoice_generate_cfdi',
        module: 'invoices',
        description:
          'Allows generating CFDI for invoices | Permite generar CFDI para facturas | 允许为发票生成 CFDI',
      },
      {
        code: 'invoice_cancel_cfdi',
        module: 'invoices',
        description:
          'Allows cancelling CFDI for invoices | Permite cancelar CFDI para facturas | 允许取消发票的 CFDI',
      },
      {
        code: 'invoice_download_pdf',
        module: 'invoices',
        description:
          'Allows downloading PDF of invoices | Permite descargar PDF de facturas | 允许下载发票 PDF',
      },
      {
        code: 'invoice_download_xml',
        module: 'invoices',
        description:
          'Allows downloading XML of invoices | Permite descargar XML de facturas | 允许下载发票 XML',
      },
      {
        code: 'invoice_convert_withdrawal',
        module: 'invoices',
        description:
          'Allows converting withdrawals to invoices | Permite convertir retiros en facturas | 允许将提取转换为发票',
      },

      // Invoice Detail Permissions
      {
        code: 'invoice_detail_module_view',
        module: 'invoice_details',
        description:
          'Allows viewing the invoice details module | Permite ver el módulo de detalles de facturas | 允许查看发票详情模块',
      },
      {
        code: 'invoice_detail_create',
        module: 'invoice_details',
        description:
          'Allows creating invoice details | Permite crear detalles de facturas | 允许创建发票详情',
      },
      {
        code: 'invoice_detail_read',
        module: 'invoice_details',
        description:
          'Allows reading invoice details | Permite leer detalles de facturas | 允许读取发票详情',
      },
      {
        code: 'invoice_detail_update',
        module: 'invoice_details',
        description:
          'Allows updating invoice details | Permite actualizar detalles de facturas | 允许更新发票详情',
      },
      {
        code: 'invoice_detail_delete',
        module: 'invoice_details',
        description:
          'Allows deleting invoice details | Permite eliminar detalles de facturas | 允许删除发票详情',
      },
      // Backup Permissions
      {
        code: 'backup_module_view',
        module: 'backups',
        description:
          'Allows viewing the backups module | Permite ver el módulo de respaldos | 允许查看备份模块',
      },
      {
        code: 'backup_config_read',
        module: 'backups',
        description:
          'Allows reading backup configuration | Permite leer la configuración de respaldos | 允许读取备份配置',
      },
      {
        code: 'backup_config_update',
        module: 'backups',
        description:
          'Allows updating backup configuration | Permite actualizar la configuración de respaldos | 允许更新备份配置',
      },
      {
        code: 'backup_run',
        module: 'backups',
        description:
          'Allows running manual backups | Permite realizar respaldos manuales | 允许运行手动备份',
      },
      {
        code: 'backup_log_read',
        module: 'backups',
        description:
          'Allows reading backup logs | Permite leer los registros de respaldos | 允许读取备份日志',
      },
      {
        code: 'backup_download',
        module: 'backups',
        description:
          'Allows downloading backup files | Permite descargar los archivos de respaldo | 允许下载备份文件',
      },

      // Analytics Permissions
      {
        code: 'analytics_module_view',
        module: 'analytics',
        description:
          'Allows viewing the analytics module | Permite ver el módulo de analíticas | 允许查看分析模块',
      },
      {
        code: 'analytics_read',
        module: 'analytics',
        description:
          'Allows reading analytics data | Permite leer datos de analíticas | 允许读取分析数据',
      },

      // Quotation Permissions
      {
        code: 'quotation_module_view',
        module: 'quotations',
        description:
          'Allows viewing the quotations module | Permite ver el módulo de cotizaciones | 允许查看报价模块',
      },
      {
        code: 'quotation_create',
        module: 'quotations',
        description: 'Allows creating quotations | Permite crear cotizaciones | 允许创建报价',
      },
      {
        code: 'quotation_read',
        module: 'quotations',
        description: 'Allows reading quotations | Permite leer cotizaciones | 允许读取报价',
      },
      {
        code: 'quotation_update',
        module: 'quotations',
        description:
          'Allows updating quotations | Permite actualizar cotizaciones | 允许更新报价',
      },
      {
        code: 'quotation_delete',
        module: 'quotations',
        description:
          'Allows deleting quotations | Permite eliminar cotizaciones | 允许删除报价',
      },
      {
        code: 'quotation_convert_to_sale',
        module: 'quotations',
        description:
          'Allows converting quotations to sales | Permite convertir cotizaciones a ventas | 允许将报价转换为销售',
      },

      // Cash Register Permissions
      {
        code: 'cash_registers_module_view',
        module: 'cash_registers',
        description:
          'Allows viewing the cash registers module | Permite ver el módulo de cajas registradoras | 允许查看现金寄存器模块',
      },
      {
        code: 'cash_registers_create',
        module: 'cash_registers',
        description: 'Allows creating cash registers | Permite crear cajas registradoras | 允许创建现金寄存器',
      },
      {
        code: 'cash_registers_read',
        module: 'cash_registers',
        description: 'Allows reading cash registers | Permite leer cajas registradoras | 允许读取现金寄存器',
      },
      {
        code: 'cash_registers_update',
        module: 'cash_registers',
        description: 'Allows updating cash registers | Permite actualizar cajas registradoras | 允许更新现金寄存器',
      },
      {
        code: 'cash_registers_delete',
        module: 'cash_registers',
        description: 'Allows deleting cash registers | Permite eliminar cajas registradoras | 允许删除现金寄存器',
      },

      // Notification Permissions
      {
        code: 'notification_module_view',
        module: 'notifications',
        description:
          'Allows viewing the notifications module | Permite ver el módulo de notificaciones | 允许查看通知模块',
      },
      {
        code: 'notification_create',
        module: 'notifications',
        description:
          'Allows creating notifications | Permite crear notificaciones | 允许创建通知',
      },
      {
        code: 'notification_read',
        module: 'notifications',
        description:
          'Allows reading notifications | Permite leer notificaciones | 允许读取通知',
      },
      {
        code: 'notification_update',
        module: 'notifications',
        description:
          'Allows updating notifications | Permite actualizar notificaciones | 允许更新通知',
      },
      {
        code: 'notification_delete',
        module: 'notifications',
        description:
          'Allows deleting notifications | Permite eliminar notificaciones | 允许删除通知',
      },
      {
        code: 'notification_mark_read',
        module: 'notifications',
        description:
          'Allows marking notifications as read | Permite marcar notificaciones como leídas | 允许将通知标记为已读',
      },

      // Expense Permissions
      {
        code: 'expense_module_view',
        module: 'expenses',
        description:
          'Allows viewing the expenses module | Permite ver el módulo de gastos | 允许查看费用模块',
      },
      {
        code: 'expense_create',
        module: 'expenses',
        description: 'Allows creating expenses | Permite crear gastos | 允许创建费用',
      },
      {
        code: 'expense_read',
        module: 'expenses',
        description: 'Allows reading expenses | Permite leer gastos | 允许读取费用',
      },
      {
        code: 'expense_update',
        module: 'expenses',
        description: 'Allows updating expenses | Permite actualizar gastos | 允许更新费用',
      },
      {
        code: 'expense_delete',
        module: 'expenses',
        description: 'Allows deleting expenses | Permite eliminar gastos | 允许删除费用',
      },

      // Account Receivable Permissions
      {
        code: 'account_receivable_module_view',
        module: 'accounts_receivable',
        description:
          'Allows viewing the accounts receivable module | Permite ver el módulo de cuentas por cobrar | 允许查看应收账款模块',
      },
      {
        code: 'account_receivable_create',
        module: 'accounts_receivable',
        description:
          'Allows creating accounts receivable | Permite crear cuentas por cobrar | 允许创建应收账款',
      },
      {
        code: 'account_receivable_read',
        module: 'accounts_receivable',
        description:
          'Allows reading accounts receivable | Permite leer cuentas por cobrar | 允许读取应收账款',
      },
      {
        code: 'account_receivable_update',
        module: 'accounts_receivable',
        description:
          'Allows updating accounts receivable | Permite actualizar cuentas por cobrar | 允许更新应收账款',
      },
      {
        code: 'account_receivable_delete',
        module: 'accounts_receivable',
        description:
          'Allows deleting accounts receivable | Permite eliminar cuentas por cobrar | 允许删除应收账款',
      },

      // Account Payable Permissions
      {
        code: 'account_payable_module_view',
        module: 'accounts_payable',
        description:
          'Allows viewing the accounts payable module | Permite ver el módulo de cuentas por pagar | 允许查看应付账款模块',
      },
      {
        code: 'account_payable_create',
        module: 'accounts_payable',
        description:
          'Allows creating accounts payable | Permite crear cuentas por pagar | 允许创建应付账款',
      },
      {
        code: 'account_payable_read',
        module: 'accounts_payable',
        description:
          'Allows reading accounts payable | Permite leer cuentas por pagar | 允许读取应付账款',
      },
      {
        code: 'account_payable_update',
        module: 'accounts_payable',
        description:
          'Allows updating accounts payable | Permite actualizar cuentas por pagar | 允许更新应付账款',
      },
      {
        code: 'account_payable_delete',
        module: 'accounts_payable',
        description:
          'Allows deleting accounts payable | Permite eliminar cuentas por pagar | 允许删除应付账款',
      },

      // Cash Flow Permissions
      {
        code: 'cash_flow_module_view',
        module: 'cash_flow',
        description:
          'Allows viewing the cash flow module | Permite ver el módulo de flujo de caja | 允许查看现金流模块',
      },
      {
        code: 'cash_flow_read',
        module: 'cash_flow',
        description:
          'Allows reading cash flow data | Permite leer datos de flujo de caja | 允许读取现金流数据',
      },

      // Audit Log Permissions
      {
        code: 'audit_log_module_view',
        module: 'audit_logs',
        description:
          'Allows viewing the audit logs module | Permite ver el módulo de logs de auditoría | 允许查看审计日志模块',
      },
      {
        code: 'audit_log_read',
        module: 'audit_logs',
        description:
          'Allows reading audit logs | Permite leer logs de auditoría | 允许读取审计日志',
      },
      {
        code: 'audit_log_export',
        module: 'audit_logs',
        description: 'Allows exporting audit logs | Permite exportar logs de auditoría | 允许导出审计日志',
      },
      {
        code: 'payment_gateway_module_view',
        module: 'payment_gateway',
        description: 'Allows viewing the payment gateway module | Permite ver el módulo de pasarela de pagos | 允许查看支付网关模块',
      },
      {
        code: 'payment_gateway_read',
        module: 'payment_gateway',
        description: 'Allows reading payment gateway data | Permite leer datos de pasarela de pagos | 允许读取支付网关数据',
      },
      {
        code: 'payment_gateway_update',
        module: 'payment_gateway',
        description: 'Allows updating payment gateway data | Permite actualizar datos de pasarela de pagos | 允许更新支付网关数据',
      },
      {
        code: 'certification_pack_module_view',
        module: 'certification_packs',
        description: 'Allows viewing the certification packs module | Permite ver el módulo de paquetes de certificación | 允许查看认证包模块',
      },
      {
        code: 'certification_pack_read',
        module: 'certification_packs',
        description: 'Allows reading certification packs | Permite leer paquetes de certificación | 允许读取认证包',
      },
      {
        code: 'certification_pack_create',
        module: 'certification_packs',
        description: 'Allows creating certification packs | Permite crear paquetes de certificación | 允许创建认证包',
      },
      {
        code: 'certification_pack_update',
        module: 'certification_packs',
        description: 'Allows updating certification packs | Permite actualizar paquetes de certificación | 允许更新认证包',
      },
      {
        code: 'certification_pack_delete',
        module: 'certification_packs',
        description: 'Allows deleting certification packs | Permite eliminar paquetes de certificación | 允许删除认证包',
      },
      {
        code: 'certification_pack_activate',
        module: 'certification_packs',
        description: 'Allows activating certification packs | Permite activar paquetes de certificación | 允许激活认证包',
      },
      {
        code: 'company_settings_module_view',
        module: 'company_settings',
        description: 'Allows viewing the company settings module | Permite ver el módulo de configuración de empresa | 允许查看公司设置模块',
      },
      {
        code: 'company_settings_read',
        module: 'company_settings',
        description: 'Allows reading company settings | Permite leer la configuración de la empresa | 允许读取公司设置',
      },
      {
        code: 'company_settings_update',
        module: 'company_settings',
        description: 'Allows updating company settings | Permite actualizar la configuración de la empresa | 允许更新公司设置',
      },
      {
        code: 'bot_module_view',
        module: 'bot',
        description: 'Allows viewing the bot module | Permite ver el módulo del bot | 允许查看机器人模块',
      },
      {
        code: 'bot_read',
        module: 'bot',
        description: 'Allows reading bot data | Permite leer datos del bot | 允许读取机器人数据',
      },
      {
        code: 'bot_update',
        module: 'bot',
        description: 'Allows updating bot data | Permite actualizar datos del bot | 允许更新机器人数据',
      },
      {
        code: 'bot_connect',
        module: 'bot',
        description: 'Allows connecting the bot | Permite conectar el bot | 允许连接机器人',
      },
      {
        code: 'bot_disconnect',
        module: 'bot',
        description: 'Allows disconnecting the bot provider | Permite desconectar el proveedor del bot | 允许断开机器人提供商',
      },
      {
        code: 'email_config_module_view',
        module: 'email_config',
        description: 'Allows viewing the email configuration module | Permite ver el módulo de configuración de correo | 允许查看邮件配置模块',
      },
      {
        code: 'email_config_read',
        module: 'email_config',
        description: 'Allows reading email configuration | Permite leer la configuración de correo | 允许读取邮件配置',
      },
      {
        code: 'email_config_update',
        module: 'email_config',
        description: 'Allows updating email configuration | Permite actualizar la configuración de correo | 允许更新邮件配置',
      },
      {
        code: 'email_config_test',
        module: 'email_config',
        description: 'Allows testing email configuration | Permite probar la configuración de correo | 允许测试邮件配置',
      },
      {
        code: 'shipment_module_view',
        module: 'shipments',
        description: 'Allows viewing the shipments module | Permite ver el módulo de envíos | 允许查看发货模块',
      },
      {
        code: 'shipment_create',
        module: 'shipments',
        description: 'Allows creating shipments | Permite crear envíos | 允许创建发货',
      },
      {
        code: 'shipment_read',
        module: 'shipments',
        description: 'Allows reading shipments | Permite leer envíos | 允许读取发货',
      },
      {
        code: 'shipment_update',
        module: 'shipments',
        description: 'Allows updating shipments | Permite actualizar envíos | 允许更新发货',
      },
      {
        code: 'shipment_delete',
        module: 'shipments',
        description: 'Allows deleting shipments | Permite eliminar envíos | 允许删除发货',
      },
      {
        code: 'webhooks_module_view',
        module: 'webhooks',
        description: 'Allows viewing the webhooks module | Permite ver el módulo de webhooks | 允许查看 Webhooks 模块',
      },
      {
        code: 'webhook_create',
        module: 'webhooks',
        description: 'Allows creating webhooks | Permite crear webhooks | 允许创建 Webhooks',
      },
      {
        code: 'webhook_read',
        module: 'webhooks',
        description: 'Allows reading webhooks | Permite leer webhooks | 允许读取 Webhooks',
      },
      {
        code: 'webhook_update',
        module: 'webhooks',
        description: 'Allows updating webhooks | Permite actualizar webhooks | 允许更新 Webhooks',
      },
      {
        code: 'webhook_delete',
        module: 'webhooks',
        description: 'Allows deleting webhooks | Permite eliminar webhooks | 允许删除 Webhooks',
      },
      {
        code: 'webhook_test',
        module: 'webhooks',
        description: 'Allows testing webhooks | Permite probar webhooks | 允许测试 Webhooks',
      },
      {
        code: 'webhook_view_logs',
        module: 'webhooks',
        description: 'Allows viewing webhook logs | Permite ver logs de webhooks | 允许查看 Webhook 日志',
      },
      {
        code: 'hr_employee_view',
        module: 'hr',
        description: 'Allows viewing employees | Permite ver empleados | 允许查看员工',
      },
      {
        code: 'hr_employee_create',
        module: 'hr',
        description: 'Allows creating employees | Permite crear empleados | 允许创建员工',
      },
      {
        code: 'hr_employee_update',
        module: 'hr',
        description: 'Allows updating employees | Permite actualizar empleados | 允许更新员工',
      },
      {
        code: 'hr_employee_delete',
        module: 'hr',
        description: 'Allows deleting employees | Permite eliminar empleados | 允许删除员工',
      },
      {
        code: 'hr_department_view',
        module: 'hr',
        description: 'Allows viewing departments | Permite ver departamentos | 允许查看部门',
      },
      {
        code: 'hr_department_create',
        module: 'hr',
        description: 'Allows creating departments | Permite crear departamentos | 允许创建部门',
      },
      {
        code: 'hr_department_update',
        module: 'hr',
        description: 'Allows updating departments | Permite actualizar departamentos | 允许更新部门',
      },
      {
        code: 'hr_department_delete',
        module: 'hr',
        description: 'Allows deleting departments | Permite eliminar departamentos | 允许删除部门',
      },
      {
        code: 'hr_position_view',
        module: 'hr',
        description: 'Allows viewing positions | Permite ver puestos | 允许查看职位',
      },
      {
        code: 'hr_position_create',
        module: 'hr',
        description: 'Allows creating positions | Permite crear puestos | 允许创建职位',
      },
      {
        code: 'hr_position_update',
        module: 'hr',
        description: 'Allows updating positions | Permite actualizar puestos | 允许更新职位',
      },
      {
        code: 'hr_position_delete',
        module: 'hr',
        description: 'Allows deleting positions | Permite eliminar puestos | 允许删除职位',
      },
      {
        code: 'hr_attendance_view',
        module: 'hr',
        description: 'Allows viewing attendance | Permite ver asistencia | 允许查看考勤',
      },
      {
        code: 'hr_attendance_create',
        module: 'hr',
        description: 'Allows creating attendance records | Permite crear registros de asistencia | 允许创建考勤记录',
      },
      {
        code: 'hr_attendance_update',
        module: 'hr',
        description: 'Allows updating attendance records | Permite actualizar registros de asistencia | 允许更新考勤记录',
      },
      {
        code: 'hr_attendance_delete',
        module: 'hr',
        description: 'Allows deleting attendance records | Permite eliminar registros de asistencia | 允许删除考勤记录',
      },
      {
        code: 'hr_leave_request_view',
        module: 'hr',
        description: 'Allows viewing leave requests | Permite ver solicitudes de ausencia | 允许查看请假申请',
      },
      {
        code: 'hr_leave_request_create',
        module: 'hr',
        description: 'Allows creating leave requests | Permite crear solicitudes de ausencia | 允许创建请假申请',
      },
      {
        code: 'hr_leave_request_update',
        module: 'hr',
        description: 'Allows updating leave requests | Permite actualizar solicitudes de ausencia | 允许更新请假申请',
      },
      {
        code: 'hr_leave_request_delete',
        module: 'hr',
        description: 'Allows deleting leave requests | Permite eliminar solicitudes de ausencia | 允许删除请假申请',
      },
      {
        code: 'hr_leave_request_approve',
        module: 'hr',
        description: 'Allows approving leave requests | Permite aprobar solicitudes de ausencia | 允许审批请假申请',
      },
      {
        code: 'hr_payroll_view',
        module: 'hr',
        description: 'Allows viewing payroll | Permite ver nómina | 允许查看薪资',
      },
      {
        code: 'hr_payroll_create',
        module: 'hr',
        description: 'Allows creating payroll | Permite crear nómina | 允许创建薪资',
      },
      {
        code: 'hr_payroll_update',
        module: 'hr',
        description: 'Allows updating payroll | Permite actualizar nómina | 允许更新薪资',
      },
      {
        code: 'hr_payroll_delete',
        module: 'hr',
        description: 'Allows deleting payroll | Permite eliminar nómina | 允许删除薪资',
      },
      {
        code: 'hr_document_view',
        module: 'hr',
        description: 'Allows viewing employee documents | Permite ver documentos de empleados | 允许查看员工文档',
      },
      {
        code: 'hr_document_create',
        module: 'hr',
        description: 'Allows creating employee documents | Permite crear documentos de empleados | 允许创建员工文档',
      },
      {
        code: 'hr_document_update',
        module: 'hr',
        description: 'Allows updating employee documents | Permite actualizar documentos de empleados | 允许更新员工文档',
      },
      {
        code: 'hr_document_delete',
        module: 'hr',
        description: 'Allows deleting employee documents | Permite eliminar documentos de empleados | 允许删除员工文档',
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
