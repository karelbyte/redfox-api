import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../models/language.entity';
import { UserContextService } from './user-context.service';

@Injectable()
export class TranslationService {
  private readonly translations = {
    // User messages
    'user.not_found': {
      es: 'Usuario con ID {id} no encontrado',
      en: 'User with ID {id} not found',
      zh: '未找到 ID 为 {id} 的用户',
    },
    'user.email_not_found': {
      es: 'Usuario con email {email} no encontrado',
      en: 'User with email {email} not found',
      zh: '未找到邮箱为 {email} 的用户',
    },
    'user.already_exists': {
      es: 'Ya existe un usuario con este email',
      en: 'A user with this email already exists',
      zh: '该邮箱已被注册',
    },
    'user.created_successfully': {
      es: 'Usuario creado exitosamente',
      en: 'User created successfully',
      zh: '用户创建成功',
    },
    'user.updated_successfully': {
      es: 'Usuario actualizado exitosamente',
      en: 'User updated successfully',
      zh: '用户更新成功',
    },
    'user.deleted_successfully': {
      es: 'Usuario eliminado exitosamente',
      en: 'User deleted successfully',
      zh: '用户删除成功',
    },

    // Authentication messages
    'auth.invalid_credentials': {
      es: 'Credenciales inválidas',
      en: 'Invalid credentials',
      zh: '凭证无效',
    },
    'auth.token_expired': {
      es: 'Token expirado',
      en: 'Token expired',
      zh: '令牌已过期',
    },
    'auth.unauthorized': {
      es: 'No autorizado',
      en: 'Unauthorized',
      zh: '未授权',
    },
    'auth.login_successful': {
      es: 'Inicio de sesión exitoso',
      en: 'Login successful',
      zh: '登录成功',
    },
    'auth.logout_successful': {
      es: 'Sesión cerrada exitosamente',
      en: 'Logged out successfully',
      zh: '登出成功',
    },
    'auth.organization_required': {
      es: 'Se requiere el contexto de la organización',
      en: 'Organization context is required',
      zh: '需要组织上下文',
    },
    'auth.user_not_found': {
      es: 'Usuario no encontrado',
      en: 'User not found',
      zh: '未找到用户',
    },
    'auth.user_already_active': {
      es: 'El usuario ya está activo',
      en: 'User is already active',
      zh: '用户已激活',
    },
    'auth.user_inactive': {
      es: 'El usuario no está activo. Por favor, revise su correo electrónico para activar su cuenta.',
      en: 'User is not active. Please check your email to activate your account.',
      zh: '用户未激活。请检查您的电子邮件以激活您的帐户。',
    },
    'auth.user_activated_successfully': {
      es: 'Usuario activado exitosamente',
      en: 'User successfully activated',
      zh: '用户激活成功',
    },
    'auth.invalid_activation_token': {
      es: 'Token de activación inválido o expirado',
      en: 'Invalid or expired activation token',
      zh: '激活令牌无效或已过期',
    },
    'auth.invalid_token_type': {
      es: 'Tipo de token inválido',
      en: 'Invalid token type',
      zh: '令牌类型无效',
    },
    'auth.invalid_reset_token': {
      es: 'Token de restablecimiento inválido o expirado',
      en: 'Invalid or expired reset token',
      zh: '重置令牌无效或已过期',
    },
    'auth.email_already_in_use': {
      es: 'La dirección de correo electrónico ya está en uso',
      en: 'The email address is already in use',
      zh: '该邮箱已被使用',
    },
    'auth.target_user_not_found': {
      es: 'Usuario objetivo no encontrado',
      en: 'Target user not found',
      zh: '未找到目标用户',
    },
    'auth.org_name_too_short': {
      es: 'El nombre de la organización genera un identificador demasiado corto. Usa un nombre más descriptivo.',
      en: 'The organization name generates an identifier that is too short. Use a more descriptive name.',
      zh: '组织名称生成的标识符太短。请使用更具描述性的名称。',
    },
    'auth.org_name_already_exists': {
      es: 'El nombre de la organización ya existe. Por favor elige otro.',
      en: 'The organization name already exists. Please choose another one.',
      zh: '组织名称已存在。请选择另一个。',
    },

    // Email configuration messages
    'email.config_org_required': {
      es: 'Se requiere el contexto de la organización para la configuración de correo electrónico',
      en: 'Organization context is required for email configuration',
      zh: '电子邮件配置需要组织上下文',
    },
    'email.config_already_exists': {
      es: 'La configuración de correo electrónico ya existe. Por favor, actualícela en su lugar.',
      en: 'Email configuration already exists. Please update it instead.',
      zh: '电子邮件配置已存在。请更新它。',
    },
    'email.config_not_found': {
      es: 'Configuración de correo electrónico no encontrada.',
      en: 'Email configuration not found.',
      zh: '未找到电子邮件配置。',
    },
    'email.test_connection_success': {
      es: 'La configuración de correo electrónico es válida y la conexión fue exitosa.',
      en: 'Email configuration is valid and connection successful.',
      zh: '电子邮件配置有效且连接成功。',
    },
    'email.test_connection_failed': {
      es: 'La prueba de configuración de correo electrónico falló: {error}',
      en: 'Email configuration test failed: {error}',
      zh: '电子邮件配置测试失败：{error}',
    },
    'email.config_required_for_send': {
      es: 'Configuración de correo electrónico no encontrada. Por favor, configure sus ajustes de correo electrónico.',
      en: 'Email configuration not found. Please configure your email settings.',
      zh: '未找到电子邮件配置。请配置您的电子邮件设置。',
    },
    'email.send_failed': {
      es: 'Error al enviar el correo electrónico: {error}',
      en: 'Failed to send email: {error}',
      zh: '发送电子邮件失败：{error}',
    },

    // Upload messages
    'uploads.org_required': {
      es: 'Se requiere el contexto de la organización para subir archivos',
      en: 'Organization context is required to upload files',
      zh: '上传文件需要组织上下文',
    },
    'uploads.max_files_exceeded': {
      es: 'Máximo {maxFiles} archivos permitidos',
      en: 'Maximum {maxFiles} files allowed',
      zh: '最多允许 {maxFiles} 个文件',
    },
    'uploads.file_too_large': {
      es: 'El archivo {filename} excede el tamaño máximo de {maxSize}MB',
      en: 'File {filename} exceeds maximum size of {maxSize}MB',
      zh: '文件 {filename} 超过最大限制 {maxSize}MB',
    },
    'uploads.invalid_file_type': {
      es: 'Tipo de archivo no permitido: {mimetype}. Tipos permitidos: {allowedTypes}',
      en: 'File type not allowed: {mimetype}. Allowed types: {allowedTypes}',
      zh: '不允许的文件类型：{mimetype}。允许的类型：{allowedTypes}',
    },

    // Permission messages
    'permission.not_found': {
      es: 'Permiso con ID {id} no encontrado',
      en: 'Permission with ID {id} not found',
      zh: '未找到 ID 为 {id} 的权限',
    },
    'permission.already_exists': {
      es: 'Ya existe un permiso con este código',
      en: 'A permission with this code already exists',
      zh: '已存在该代码的权限',
    },
    'permission.created_successfully': {
      es: 'Permiso creado exitosamente',
      en: 'Permission created successfully',
      zh: '权限创建成功',
    },
    'permission.updated_successfully': {
      es: 'Permiso actualizado exitosamente',
      en: 'Permission updated successfully',
      zh: '权限更新成功',
    },
    'permission.deleted_successfully': {
      es: 'Permiso eliminado exitosamente',
      en: 'Permission deleted successfully',
      zh: '权限删除成功',
    },

    // Product messages
    'product.not_found': {
      es: 'Producto con ID {id} no encontrado',
      en: 'Product with ID {id} not found',
      zh: '未找到 ID 为 {id} 的产品',
    },
    'product.slug_already_exists': {
      es: 'Ya existe un producto con el slug "{slug}"',
      en: 'A product with slug "{slug}" already exists',
      zh: '已存在 slug 为 "{slug}" 的产品',
    },
    'product.sku_already_exists': {
      es: 'Ya existe un producto con el SKU "{sku}"',
      en: 'A product with SKU "{sku}" already exists',
      zh: '已存在 SKU 为 "{sku}" 的产品',
    },
    'product.created_successfully': {
      es: 'Producto creado exitosamente',
      en: 'Product created successfully',
      zh: '产品创建成功',
    },
    'product.updated_successfully': {
      es: 'Producto actualizado exitosamente',
      en: 'Product updated successfully',
      zh: '产品更新成功',
    },
    'product.deleted_successfully': {
      es: 'Producto eliminado exitosamente',
      en: 'Product deleted successfully',
      zh: '产品删除成功',
    },
    'product.cannot_delete_in_use': {
      es: 'No se puede eliminar el producto "{name}" porque está siendo usado en {inventoryCount} inventario(s) y {warehouseOpeningCount} apertura(s) de almacén. Primero debe eliminar estos registros.',
      en: 'Cannot delete product "{name}" because it is being used in {inventoryCount} inventory record(s) and {warehouseOpeningCount} warehouse opening(s). First, you must delete these records.',
      zh: '无法删除产品 "{name}"，因为它正被 {inventoryCount} 条库存记录和 {warehouseOpeningCount} 个仓库开盘使用。请先删除这些记录。',
    },

    // Provider messages
    'provider.not_found': {
      es: 'Proveedor con ID {id} no encontrado',
      en: 'Provider with ID {id} not found',
      zh: '未找到 ID 为 {id} 的供应商',
    },
    'provider.created_successfully': {
      es: 'Proveedor creado exitosamente',
      en: 'Provider created successfully',
      zh: '供应商创建成功',
    },
    'provider.updated_successfully': {
      es: 'Proveedor actualizado exitosamente',
      en: 'Provider updated successfully',
      zh: '供应商更新成功',
    },
    'provider.deleted_successfully': {
      es: 'Proveedor eliminado exitosamente',
      en: 'Provider deleted successfully',
      zh: '供应商删除成功',
    },
    'provider.cannot_delete_in_use': {
      es: 'No se puede eliminar el proveedor porque tiene historial (Órdenes: {purchaseOrderCount}, Recepciones: {receptionCount}, Gastos: {expenseCount}, CxP: {accountPayableCount}, Devoluciones: {returnCount}).',
      en: 'Cannot delete provider because it has history (Orders: {purchaseOrderCount}, Receptions: {receptionCount}, Expenses: {expenseCount}, AP: {accountPayableCount}, Returns: {returnCount}).',
      zh: '无法删除供应商，因为它有历史记录（订单：{purchaseOrderCount}，入库：{receptionCount}，费用：{expenseCount}，应付账款：{accountPayableCount}，退货：{returnCount}）。',
    },

    // Account Payable messages
    'account_payable.not_found': {
      es: 'Cuenta por pagar con ID {id} no encontrada',
      en: 'Account Payable with ID {id} not found',
      zh: '未找到 ID 为 {id} 的应付账款',
    },

    // Account Receivable messages
    'account_receivable.not_found': {
      es: 'Cuenta por cobrar con ID {id} no encontrada',
      en: 'Account Receivable with ID {id} not found',
      zh: '未找到 ID 为 {id} 的应收账款',
    },
    'account_receivable.reference_exists': {
      es: 'El número de referencia ya existe',
      en: 'Reference number already exists',
      zh: '参考编号已存在',
    },
    'account_receivable.already_paid': {
      es: 'La cuenta ya está pagada en su totalidad',
      en: 'The account is already fully paid',
      zh: '该账单已全部付清',
    },
    'account_receivable.invalid_amount': {
      es: 'El monto del pago excede el saldo restante',
      en: 'Payment amount exceeds the remaining balance',
      zh: '支付金额超过了剩余余额',
    },

    // Reception messages
    'reception.not_found': {
      es: 'Recepción con ID {id} no encontrada',
      en: 'Reception with ID {id} not found',
      zh: '未找到 ID 为 {id} 的入库单',
    },
    'reception.detail_not_found': {
      es: 'Detalle de recepción con ID {detailId} no encontrado en la recepción {receptionId}',
      en: 'Reception detail with ID {detailId} not found in reception {receptionId}',
      zh: '入库单 {receptionId} 中未找到 ID 为 {detailId} 的入库明细',
    },
    'reception.provider_not_found': {
      es: 'Proveedor con ID {providerId} no encontrado',
      en: 'Provider with ID {providerId} not found',
      zh: '未找到 ID 为 {providerId} 的供应商',
    },
    'reception.warehouse_not_found': {
      es: 'Almacén con ID {warehouseId} no encontrado',
      en: 'Warehouse with ID {warehouseId} not found',
      zh: '未找到 ID 为 {warehouseId} 的仓库',
    },
    'reception.product_not_found': {
      es: 'Producto con ID {productId} no encontrado',
      en: 'Product with ID {productId} not found',
      zh: '未找到 ID 为 {productId} 的产品',
    },
    'reception.already_closed': {
      es: 'La recepción ya está cerrada',
      en: 'The reception is already closed',
      zh: '入库单已关闭',
    },
    'reception.no_products_to_transfer': {
      es: 'La recepción no tiene productos para transferir',
      en: 'The reception has no products to transfer',
      zh: '入库单没有可转移的产品',
    },
    'reception.closed_successfully': {
      es: 'Recepción cerrada exitosamente. {transferredProducts} productos transferidos al inventario.',
      en: 'Reception closed successfully. {transferredProducts} products transferred to inventory.',
      zh: '入库单关闭成功。{transferredProducts} 件产品已转入库存。',
    },
    'reception.closed_no_products': {
      es: 'Recepción cerrada exitosamente. No había productos para transferir.',
      en: 'Reception closed successfully. No products to transfer.',
      zh: '入库单关闭成功。没有可转移的产品。',
    },
    'reception.created_successfully': {
      es: 'Recepción creada exitosamente',
      en: 'Reception created successfully',
      zh: '入库单创建成功',
    },
    'reception.updated_successfully': {
      es: 'Recepción actualizada exitosamente',
      en: 'Reception updated successfully',
      zh: '入库单更新成功',
    },
    'reception.deleted_successfully': {
      es: 'Recepción eliminada exitosamente',
      en: 'Reception deleted successfully',
      zh: '入库单删除成功',
    },

    // RolePermission messages
    'role_permission.already_exists': {
      es: 'Ya existe esta relación entre rol y permiso',
      en: 'This role-permission relationship already exists',
      zh: '该角色与权限的关联已存在',
    },
    'role_permission.not_found': {
      es: 'Relación rol-permiso con ID {id} no encontrada',
      en: 'Role-permission relationship with ID {id} not found',
      zh: '未找到 ID 为 {id} 的角色权限关联',
    },
    'role_permission.relationship_not_found': {
      es: 'Relación rol-permiso no encontrada',
      en: 'Role-permission relationship not found',
      zh: '角色权限关联不存在',
    },
    'role_permission.role_not_found': {
      es: 'Rol con ID {roleId} no encontrado',
      en: 'Role with ID {roleId} not found',
      zh: '未找到 ID 为 {roleId} 的角色',
    },
    'role_permission.permissions_not_found': {
      es: 'Permisos no encontrados: {missingIds}',
      en: 'Permissions not found: {missingIds}',
      zh: '未找到以下权限：{missingIds}',
    },
    'role_permission.permission_ids_array_required': {
      es: 'permissionIds debe ser un array',
      en: 'permissionIds must be an array',
      zh: 'permissionIds 必须是数组',
    },
    'role_permission.permission_ids_empty': {
      es: 'permissionIds no puede estar vacío',
      en: 'permissionIds cannot be empty',
      zh: 'permissionIds 不能为空',
    },
    'role_permission.created_successfully': {
      es: 'Relación rol-permiso creada exitosamente',
      en: 'Role-permission relationship created successfully',
      zh: '角色权限关联创建成功',
    },
    'role_permission.assigned_successfully': {
      es: 'Permisos asignados al rol exitosamente',
      en: 'Permissions assigned to role successfully',
      zh: '权限已成功分配给角色',
    },
    'role_permission.updated_successfully': {
      es: 'Permisos del rol actualizados exitosamente',
      en: 'Role permissions updated successfully',
      zh: '角色权限更新成功',
    },
    'role_permission.deleted_successfully': {
      es: 'Relación rol-permiso eliminada exitosamente',
      en: 'Role-permission relationship deleted successfully',
      zh: '角色权限关联删除成功',
    },

    // UserAttribution messages
    'user_attribution.already_exists': {
      es: 'Ya existe esta atribución para el usuario',
      en: 'This attribution already exists for the user',
      zh: '该用户的此归属已存在',
    },
    'user_attribution.not_found': {
      es: 'Atribución con ID {id} no encontrada',
      en: 'Attribution with ID {id} not found',
      zh: '未找到 ID 为 {id} 的归属',
    },
    'user_attribution.created_successfully': {
      es: 'Atribución creada exitosamente',
      en: 'Attribution created successfully',
      zh: '归属创建成功',
    },
    'user_attribution.updated_successfully': {
      es: 'Atribución actualizada exitosamente',
      en: 'Attribution updated successfully',
      zh: '归属更新成功',
    },
    'user_attribution.deleted_successfully': {
      es: 'Atribución eliminada exitosamente',
      en: 'Attribution deleted successfully',
      zh: '归属删除成功',
    },
    'user_attribution.assigned_successfully': {
      es: 'Atribuciones asignadas exitosamente',
      en: 'Attributions assigned successfully',
      zh: '归属分配成功',
    },

    // CashRegister messages
    'cash_register.not_found': {
      es: 'Caja registradora con ID {id} no encontrada',
      en: 'Cash register with ID {id} not found',
      zh: '未找到 ID 为 {id} 的收银机',
    },
    'cash_register.already_exists': {
      es: 'Ya existe una caja registradora con el código {code}',
      en: 'Cash register with code {code} already exists',
      zh: '已存在代码为 {code} 的收银机',
    },
    'cash_register.already_open': {
      es: 'Ya hay una caja registradora abierta',
      en: 'There is already an open cash register',
      zh: '已有一台收银机处于开启状态',
    },
    'cash_register.already_closed': {
      es: 'La caja registradora ya está cerrada',
      en: 'The cash register is already closed',
      zh: '收银机已关闭',
    },
    'cash_register.created_successfully': {
      es: 'Caja registradora creada exitosamente',
      en: 'Cash register created successfully',
      zh: '收银机创建成功',
    },
    'cash_register.opened_successfully': {
      es: 'Caja registradora abierta exitosamente',
      en: 'Cash register opened successfully',
      zh: '收银机开启成功',
    },
    'cash_register.closed_successfully': {
      es: 'Caja registradora cerrada exitosamente',
      en: 'Cash register closed successfully',
      zh: '收银机关闭成功',
    },
    'cash_register.updated_successfully': {
      es: 'Caja registradora actualizada exitosamente',
      en: 'Cash register updated successfully',
      zh: '收银机更新成功',
    },
    'cash_register.deleted_successfully': {
      es: 'Caja registradora eliminada exitosamente',
      en: 'Cash register deleted successfully',
      zh: '收银机删除成功',
    },
    'cash_register.no_open_register': {
      es: 'No hay una caja registradora abierta actualmente',
      en: 'There is no open cash register currently',
      zh: '当前没有开启的收银机',
    },

    // CashTransaction messages
    'cash_transaction.not_found': {
      es: 'Transacción de caja con ID {id} no encontrada',
      en: 'Cash transaction with ID {id} not found',
      zh: '未找到 ID 为 {id} 的现金交易',
    },
    'cash_transaction.cash_register_not_found': {
      es: 'Caja registradora con ID {id} no encontrada',
      en: 'Cash register with ID {id} not found',
      zh: '未找到 ID 为 {id} 的收银机',
    },
    'cash_transaction.cash_register_closed': {
      es: 'No se pueden crear transacciones en una caja cerrada',
      en: 'Cannot create transactions in a closed cash register',
      zh: '无法在已关闭的收银机中创建交易',
    },
    'cash_transaction.created_successfully': {
      es: 'Transacción de caja creada exitosamente',
      en: 'Cash transaction created successfully',
      zh: '现金交易创建成功',
    },
    'cash_transaction.invalid_amount': {
      es: 'El monto de la transacción debe ser mayor a cero',
      en: 'Transaction amount must be greater than zero',
      zh: '交易金额必须大于零',
    },
    'cash_transaction.invalid_type': {
      es: 'Tipo de transacción no válido',
      en: 'Invalid transaction type',
      zh: '无效的交易类型',
    },

    // Role messages
    'role.not_found': {
      es: 'Rol con ID {id} no encontrado',
      en: 'Role with ID {id} not found',
      zh: '未找到 ID 为 {id} 的角色',
    },
    'role.already_exists': {
      es: 'Ya existe un rol con el código "{code}"',
      en: 'A role with code "{code}" already exists',
      zh: '已存在代码为 "{code}" 的角色',
    },
    'role.created_successfully': {
      es: 'Rol creado exitosamente',
      en: 'Role created successfully',
      zh: '角色创建成功',
    },
    'role.updated_successfully': {
      es: 'Rol actualizado exitosamente',
      en: 'Role updated successfully',
      zh: '角色更新成功',
    },
    'role.deleted_successfully': {
      es: 'Rol eliminado exitosamente',
      en: 'Role deleted successfully',
      zh: '角色删除成功',
    },

    // Language messages
    'language.not_found': {
      es: 'Idioma con ID {id} no encontrado',
      en: 'Language with ID {id} not found',
      zh: '未找到 ID 为 {id} 的语言',
    },
    'language.code_not_found': {
      es: 'Idioma con código {code} no encontrado',
      en: 'Language with code {code} not found',
      zh: '未找到代码为 {code} 的语言',
    },
    'language.already_exists': {
      es: 'Ya existe un idioma con este código',
      en: 'A language with this code already exists',
      zh: '已存在该代码的语言',
    },
    'language.no_default_found': {
      es: 'No se encontró un idioma por defecto',
      en: 'No default language found',
      zh: '未找到默认语言',
    },
    'language.cannot_delete_default': {
      es: 'No se puede eliminar el idioma por defecto',
      en: 'Cannot delete the default language',
      zh: '无法删除默认语言',
    },
    'language.created_successfully': {
      es: 'Idioma creado exitosamente',
      en: 'Language created successfully',
      zh: '语言创建成功',
    },
    'language.updated_successfully': {
      es: 'Idioma actualizado exitosamente',
      en: 'Language updated successfully',
      zh: '语言更新成功',
    },
    'language.deleted_successfully': {
      es: 'Idioma eliminado exitosamente',
      en: 'Language deleted successfully',
      zh: '语言删除成功',
    },
    'language.set_default_successfully': {
      es: 'Idioma establecido como predeterminado exitosamente',
      en: 'Language set as default successfully',
      zh: '已成功将语言设置为默认',
    },

    // Brand messages
    'brand.not_found': {
      es: 'Marca con ID {id} no encontrada',
      en: 'Brand with ID {id} not found',
      zh: '未找到 ID 为 {id} 的品牌',
    },
    'brand.already_exists': {
      es: 'Ya existe una marca con el código "{code}"',
      en: 'A brand with code "{code}" already exists',
      zh: '已存在代码为 "{code}" 的品牌',
    },
    'brand.created_successfully': {
      es: 'Marca creada exitosamente',
      en: 'Brand created successfully',
      zh: '品牌创建成功',
    },
    'brand.updated_successfully': {
      es: 'Marca actualizada exitosamente',
      en: 'Brand updated successfully',
      zh: '品牌更新成功',
    },
    'brand.deleted_successfully': {
      es: 'Marca eliminada exitosamente',
      en: 'Brand deleted successfully',
      zh: '品牌删除成功',
    },
    'brand.cannot_delete_in_use': {
      es: 'No se puede eliminar la marca "{description}" porque está siendo usada por {count} producto(s). Primero debe cambiar o eliminar los productos que usan esta marca.',
      en: 'Cannot delete brand "{description}" because it is being used by {count} product(s). First, you must change or delete the products that use this brand.',
      zh: '无法删除品牌 "{description}"，因为它正被 {count} 个产品使用。请先更改或删除使用该品牌的产品。',
    },

    // Currency messages
    'currency.not_found': {
      es: 'Moneda con ID {id} no encontrada',
      en: 'Currency with ID {id} not found',
      zh: '未找到 ID 为 {id} 的货币',
    },
    'currency.code_not_found': {
      es: 'Moneda con código {code} no encontrada',
      en: 'Currency with code {code} not found',
      zh: '未找到代码为 {code} 的货币',
    },
    'currency.already_exists': {
      es: 'Ya existe una moneda con el código "{code}"',
      en: 'A currency with code "{code}" already exists',
      zh: '已存在代码为 "{code}" 的货币',
    },
    'currency.created_successfully': {
      es: 'Moneda creada exitosamente',
      en: 'Currency created successfully',
      zh: '货币创建成功',
    },
    'currency.updated_successfully': {
      es: 'Moneda actualizada exitosamente',
      en: 'Currency updated successfully',
      zh: '货币更新成功',
    },
    'currency.deleted_successfully': {
      es: 'Moneda eliminada exitosamente',
      en: 'Currency deleted successfully',
      zh: '货币删除成功',
    },

    // Inventory messages
    'inventory.not_found': {
      es: 'Inventario con ID {id} no encontrado',
      en: 'Inventory with ID {id} not found',
      zh: '未找到 ID 为 {id} 的库存',
    },
    'inventory.created_successfully': {
      es: 'Inventario creado exitosamente',
      en: 'Inventory created successfully',
      zh: '库存创建成功',
    },
    'inventory.updated_successfully': {
      es: 'Inventario actualizado exitosamente',
      en: 'Inventory updated successfully',
      zh: '库存更新成功',
    },
    'inventory.deleted_successfully': {
      es: 'Inventario eliminado exitosamente',
      en: 'Inventory deleted successfully',
      zh: '库存删除成功',
    },
    'inventory.alerts_generated': {
      es: 'Alertas generadas exitosamente',
      en: 'Alerts generated successfully',
      zh: '警报生成成功',
    },
    'inventory.product_alerts_generated': {
      es: 'Alertas del producto generadas exitosamente',
      en: 'Product alerts generated successfully',
      zh: '产品警报生成成功',
    },

    // Measurement Unit messages
    'measurement_unit.not_found': {
      es: 'Unidad de medida con ID {id} no encontrada',
      en: 'Measurement unit with ID {id} not found',
      zh: '未找到 ID 为 {id} 的计量单位',
    },
    'measurement_unit.already_exists': {
      es: 'Ya existe una unidad de medida con el código "{code}"',
      en: 'A measurement unit with code "{code}" already exists',
      zh: '已存在代码为 "{code}" 的计量单位',
    },
    'measurement_unit.created_successfully': {
      es: 'Unidad de medida creada exitosamente',
      en: 'Measurement unit created successfully',
      zh: '计量单位创建成功',
    },
    'measurement_unit.updated_successfully': {
      es: 'Unidad de medida actualizada exitosamente',
      en: 'Measurement unit updated successfully',
      zh: '计量单位更新成功',
    },
    'measurement_unit.deleted_successfully': {
      es: 'Unidad de medida eliminada exitosamente',
      en: 'Measurement unit deleted successfully',
      zh: '计量单位删除成功',
    },
    'measurement_unit.cannot_delete_in_use': {
      es: 'No se puede eliminar la unidad de medida "{description}" porque está siendo usada por {count} producto(s). Primero debe cambiar o eliminar los productos que usan esta unidad de medida.',
      en: 'Cannot delete measurement unit "{description}" because it is being used by {count} product(s). First, you must change or delete the products that use this measurement unit.',
      zh: '无法删除计量单位 "{description}"，因为它正被 {count} 个产品使用。请先更改或删除使用该计量单位的产品。',
    },

    // Tax messages
    'tax.not_found': {
      es: 'Impuesto con ID {id} no encontrado',
      en: 'Tax with ID {id} not found',
      zh: '未找到 ID 为 {id} 的税率',
    },
    'tax.already_exists': {
      es: 'Ya existe un impuesto con el código {code}',
      en: 'Tax with code {code} already exists',
      zh: '已存在代码为 {code} 的税率',
    },
    'tax.cannot_delete_in_use': {
      es: 'No se puede eliminar el impuesto "{name}" porque está siendo usado por {count} producto(s). Primero debe cambiar o eliminar los productos que usan este impuesto.',
      en: 'Cannot delete tax "{name}" because it is being used by {count} product(s). First change or delete the products that use this tax.',
      zh: '无法删除税率 "{name}"，因为它正被 {count} 个产品使用。请先更改或删除使用该税率的产品。',
    },
    'tax.created_successfully': {
      es: 'Impuesto creado exitosamente',
      en: 'Tax created successfully',
      zh: '税率创建成功',
    },
    'tax.updated_successfully': {
      es: 'Impuesto actualizado exitosamente',
      en: 'Tax updated successfully',
      zh: '税率更新成功',
    },
    'tax.deleted_successfully': {
      es: 'Impuesto eliminado exitosamente',
      en: 'Tax deleted successfully',
      zh: '税率删除成功',
    },
    'tax.activated_successfully': {
      es: 'Impuesto activado exitosamente',
      en: 'Tax activated successfully',
      zh: '税率已激活',
    },
    'tax.deactivated_successfully': {
      es: 'Impuesto desactivado exitosamente',
      en: 'Tax deactivated successfully',
      zh: '税率已停用',
    },

    // Withdrawal messages
    'withdrawal.not_found': {
      es: 'Salida con ID {id} no encontrada',
      en: 'Withdrawal with ID {id} not found',
      zh: '未找到 ID 为 {id} 的出库单',
    },
    'withdrawal.client_not_found': {
      es: 'Cliente con ID {id} no encontrado',
      en: 'Client with ID {id} not found',
      zh: '未找到 ID 为 {id} 的客户',
    },
    'withdrawal.warehouse_not_found': {
      es: 'Almacén con ID {id} no encontrado',
      en: 'Warehouse with ID {id} not found',
      zh: '未找到 ID 为 {id} 的仓库',
    },
    'withdrawal.product_not_found': {
      es: 'Producto con ID {id} no encontrado',
      en: 'Product with ID {id} not found',
      zh: '未找到 ID 为 {id} 的产品',
    },
    'withdrawal.detail_not_found': {
      es: 'Detalle de salida con ID {id} no encontrado',
      en: 'Withdrawal detail with ID {id} not found',
      zh: '未找到 ID 为 {id} 的出库明细',
    },
    'withdrawal.insufficient_stock': {
      es: 'Stock insuficiente para el producto {product} en el almacén {warehouse}. Stock disponible: {available}, solicitado: {requested}',
      en: 'Insufficient stock for product {product} in warehouse {warehouse}. Available stock: {available}, requested: {requested}',
      zh: '产品 {product} 在仓库 {warehouse} 中库存不足。可用库存：{available}，请求数量：{requested}',
    },
    'withdrawal.already_closed': {
      es: 'La salida ya está cerrada',
      en: 'The withdrawal is already closed',
      zh: '出库单已关闭',
    },
    'withdrawal.cannot_modify_closed': {
      es: 'No se puede modificar una salida cerrada',
      en: 'Cannot modify a closed withdrawal',
      zh: '无法修改已关闭的出库单',
    },
    'withdrawal.created_successfully': {
      es: 'Salida creada exitosamente',
      en: 'Withdrawal created successfully',
      zh: '出库单创建成功',
    },
    'withdrawal.updated_successfully': {
      es: 'Salida actualizada exitosamente',
      en: 'Withdrawal updated successfully',
      zh: '出库单更新成功',
    },
    'withdrawal.deleted_successfully': {
      es: 'Salida eliminada exitosamente',
      en: 'Withdrawal deleted successfully',
      zh: '出库单删除成功',
    },
    'withdrawal.closed_successfully': {
      es: 'Salida cerrada exitosamente',
      en: 'Withdrawal closed successfully',
      zh: '出库单关闭成功',
    },
    'withdrawal.detail_created_successfully': {
      es: 'Detalle de salida creado exitosamente',
      en: 'Withdrawal detail created successfully',
      zh: '出库明细创建成功',
    },
    'withdrawal.detail_updated_successfully': {
      es: 'Detalle de salida actualizado exitosamente',
      en: 'Withdrawal detail updated successfully',
      zh: '出库明细更新成功',
    },
    'withdrawal.detail_deleted_successfully': {
      es: 'Detalle de salida eliminado exitosamente',
      en: 'Withdrawal detail deleted successfully',
      zh: '出库明细删除成功',
    },

    // Shipment messages
    'shipment.not_found': {
      es: 'Envío con ID {id} no encontrado',
      en: 'Shipment with ID {id} not found',
      zh: '未找到 ID 为 {id} 的货件',
    },
    'shipment.withdrawal_not_found': {
      es: 'No se encontró la venta asociada a este envío',
      en: 'Associated sale not found for this shipment',
      zh: '未找到与此货件相关的销售',
    },
    'shipment.created_successfully': {
      es: 'Envío registrado exitosamente',
      en: 'Shipment registered successfully',
      zh: '货件注册成功',
    },
    'shipment.updated_successfully': {
      es: 'Envío actualizado exitosamente',
      en: 'Shipment updated successfully',
      zh: '货件更新成功',
    },
    'shipment.deleted_successfully': {
      es: 'Envío eliminado exitosamente',
      en: 'Shipment deleted successfully',
      zh: '货件删除成功',
    },
    'shipment.status_update_title': {
      es: 'Actualización de Envío',
      en: 'Shipment Update',
      zh: '货件更新',
    },
    'shipment.status_update_message': {
      es: 'El envío {id} ha cambiado su estado a {status}.',
      en: 'Shipment {id} has changed its status to {status}.',
      zh: '货件 {id} 的状态已更改为 {status}。',
    },
    'shipment.delayed_alert_title': {
      es: 'Alerta de Envío Retrasado ⚠️',
      en: 'Delayed Shipment Alert ⚠️',
      zh: '货件延误警报 ⚠️',
    },
    'shipment.delayed_alert_message': {
      es: 'El envío para la venta {code} ({carrier}) está retrasado. Debió llegar el {date}.',
      en: 'The shipment for sale {code} ({carrier}) is delayed. It should have arrived on {date}.',
      zh: '销售 {code} ({carrier}) 的货件已延误。应于 {date} 送达。',
    },
    'shipment.whatsapp_sent': {
      es: '🚚 *¡Tu pedido está en camino!*\n\nHola {name}, tu pedido de *{company}* ya fue enviado.\n\n📦 *Paquetería:* {carrier}\n🔢 *Guía:* {tracking}\n🔗 *Rastreo:* {url}\n\n¡Gracias por tu compra!',
      en: '🚚 *Your order is on its way!*\n\nHi {name}, your order from *{company}* has been shipped.\n\n📦 *Carrier:* {carrier}\n🔢 *Tracking:* {tracking}\n🔗 *Track here:* {url}\n\nThanks for your purchase!',
      zh: '🚚 *您的订单已发货！*\n\n您好 {name}，您在 *{company}* 的订单已经发货。\n\n📦 *承运商:* {carrier}\n🔢 *单号:* {tracking}\n🔗 *查询链接:* {url}\n\n感谢您的购买！',
    },
    'shipment.whatsapp_delivered': {
      es: '✅ *¡Pedido Entregado!*\n\nHola {name}, tu pedido con la guía *{tracking}* ha sido entregado exitosamente.\n\nEsperamos que lo disfrutes. ¡Vuelve pronto!',
      en: '✅ *Order Delivered!*\n\nHi {name}, your order with tracking *{tracking}* has been successfully delivered.\n\nWe hope you enjoy it. Come back soon!',
      zh: '✅ *订单已送达！*\n\n您好 {name}，您的订单（单号 *{tracking}*）已成功送达。\n\n希望您满意。欢迎再次光临！',
    },

    // Warehouse messages
    'warehouse.not_found': {
      es: 'Almacén con ID {id} no encontrado',
      en: 'Warehouse with ID {id} not found',
      zh: '未找到 ID 为 {id} 的仓库',
    },
    'warehouse.already_exists': {
      es: 'Ya existe un almacén con el código {code}',
      en: 'Warehouse with code {code} already exists',
      zh: '已存在代码为 {code} 的仓库',
    },
    'warehouse.already_closed': {
      es: 'El almacén ya está cerrado',
      en: 'The warehouse is already closed',
      zh: '仓库已关闭',
    },
    'warehouse.already_open': {
      es: 'El almacén ya está abierto',
      en: 'The warehouse is already open',
      zh: '仓库已开启',
    },
    'warehouse.cannot_delete_in_use': {
      es: 'No se puede eliminar el almacén "{name}" porque está siendo usado por {count} producto(s).',
      en: 'Cannot delete warehouse "{name}" because it is being used by {count} product(s).',
      zh: '无法删除仓库 "{name}"，因为它正被 {count} 个产品使用。',
    },
    'warehouse.created_successfully': {
      es: 'Almacén creado exitosamente',
      en: 'Warehouse created successfully',
      zh: '仓库创建成功',
    },
    'warehouse.updated_successfully': {
      es: 'Almacén actualizado exitosamente',
      en: 'Warehouse updated successfully',
      zh: '仓库更新成功',
    },
    'warehouse.deleted_successfully': {
      es: 'Almacén eliminado exitosamente',
      en: 'Warehouse deleted successfully',
      zh: '仓库删除成功',
    },
    'warehouse.closed_successfully': {
      es: 'Almacén cerrado exitosamente',
      en: 'Warehouse closed successfully',
      zh: '仓库关闭成功',
    },
    'warehouse.closed_with_transfers': {
      es: 'Almacén cerrado exitosamente. {count} producto(s) transferidos al inventario.',
      en: 'Warehouse closed successfully. {count} product(s) transferred to inventory.',
      zh: '仓库关闭成功。{count} 件产品已转入库存。',
    },
    'warehouse.closed_no_transfers': {
      es: 'Almacén cerrado exitosamente. No había productos para transferir.',
      en: 'Warehouse closed successfully. No products to transfer.',
      zh: '仓库关闭成功。没有可转移的产品。',
    },
    'warehouse.opened_successfully': {
      es: 'Almacén abierto exitosamente',
      en: 'Warehouse opened successfully',
      zh: '仓库开启成功',
    },
    'warehouse.status_updated_successfully': {
      es: 'Estado del almacén actualizado exitosamente',
      en: 'Warehouse status updated successfully',
      zh: '仓库状态更新成功',
    },

    // Warehouse Opening messages
    'warehouse_opening.not_found': {
      es: 'Apertura de almacén con ID {id} no encontrada',
      en: 'Warehouse opening with ID {id} not found',
      zh: '未找到 ID 为 {id} 的仓库开盘',
    },
    'warehouse_opening.already_exists': {
      es: 'Ya existe una apertura para el producto {product} en el almacén {warehouse}',
      en: 'Opening already exists for product {product} in warehouse {warehouse}',
      zh: '产品 {product} 在仓库 {warehouse} 中已存在开盘记录',
    },
    'warehouse_opening.created_successfully': {
      es: 'Apertura de almacén creada exitosamente',
      en: 'Warehouse opening created successfully',
      zh: '仓库开盘创建成功',
    },
    'warehouse_opening.updated_successfully': {
      es: 'Apertura de almacén actualizada exitosamente',
      en: 'Warehouse opening updated successfully',
      zh: '仓库开盘更新成功',
    },
    'warehouse_opening.deleted_successfully': {
      es: 'Apertura de almacén eliminada exitosamente',
      en: 'Warehouse opening deleted successfully',
      zh: '仓库开盘删除成功',
    },
    'warehouse_opening.warehouse_not_found': {
      es: 'Almacén con ID {id} no encontrado',
      en: 'Warehouse with ID {id} not found',
      zh: '未找到 ID 为 {id} 的仓库',
    },
    'warehouse_opening.product_not_found': {
      es: 'Producto con ID {id} no encontrado',
      en: 'Product with ID {id} not found',
      zh: '未找到 ID 为 {id} 的产品',
    },

    // Category messages
    'category.not_found': {
      es: 'Categoría con ID {id} no encontrada',
      en: 'Category with ID {id} not found',
      zh: '未找到 ID 为 {id} 的分类',
    },
    'category.slug_not_found': {
      es: 'Categoría con slug {slug} no encontrada',
      en: 'Category with slug {slug} not found',
      zh: '未找到 slug 为 {slug} 的分类',
    },
    'category.parent_not_found': {
      es: 'Categoría padre con ID {id} no encontrada',
      en: 'Parent category with ID {id} not found',
      zh: '未找到 ID 为 {id} 的父分类',
    },
    'category.already_exists': {
      es: 'Ya existe una categoría con el slug "{slug}"',
      en: 'A category with slug "{slug}" already exists',
      zh: '已存在 slug 为 "{slug}" 的分类',
    },
    'category.created_successfully': {
      es: 'Categoría creada exitosamente',
      en: 'Category created successfully',
      zh: '分类创建成功',
    },
    'category.updated_successfully': {
      es: 'Categoría actualizada exitosamente',
      en: 'Category updated successfully',
      zh: '分类更新成功',
    },
    'category.deleted_successfully': {
      es: 'Categoría eliminada exitosamente',
      en: 'Category deleted successfully',
      zh: '分类删除成功',
    },
    'category.cannot_delete_in_use': {
      es: 'No se puede eliminar la categoría "{name}" porque está siendo usada por {count} producto(s). Primero debe cambiar o eliminar los productos que usan esta categoría.',
      en: 'Cannot delete category "{name}" because it is being used by {count} product(s). First, you must change or delete the products that use this category.',
      zh: '无法删除分类 "{name}"，因为它正被 {count} 个产品使用。请先更改或删除使用该分类的产品。',
    },
    'category.cannot_delete_with_children': {
      es: 'No se puede eliminar la categoría "{name}" porque tiene {count} subcategoría(s). Primero debe eliminar o mover las subcategorías.',
      en: 'Cannot delete category "{name}" because it has {count} subcategory(ies). First, you must delete or move the subcategories.',
      zh: '无法删除分类 "{name}"，因为它有 {count} 个子分类。请先删除或移动这些子分类。',
    },
    'category.hierarchy_cycle': {
      es: 'No se puede crear un ciclo en la jerarquía de categorías',
      en: 'Cannot create a cycle in the category hierarchy',
      zh: '无法在分类层级中创建循环',
    },
    'category.hierarchy_cycle_detected': {
      es: 'Se ha detectado un ciclo en la jerarquía de categorías',
      en: 'A cycle has been detected in the category hierarchy',
      zh: '分类层级中检测到循环',
    },
    'category.cannot_deactivate_with_active_children': {
      es: 'No se puede desactivar una categoría que tiene hijos activos',
      en: 'Cannot deactivate a category that has active children',
      zh: '无法停用拥有活跃子分类的分类',
    },
    'category.cannot_be_own_parent': {
      es: 'Una categoría no puede ser su propia categoría padre',
      en: 'A category cannot be its own parent category',
      zh: '分类不能以自身为父分类',
    },
    'category.cannot_change_parent_with_children': {
      es: 'No se puede cambiar la categoría padre de una categoría que tiene hijos',
      en: 'Cannot change the parent category of a category that has children',
      zh: '无法更改拥有子分类的分类的父分类',
    },

    // Client messages
    'client.not_found': {
      es: 'Cliente con ID {id} no encontrado',
      en: 'Client with ID {id} not found',
      zh: '未找到 ID 为 {id} 的客户',
    },
    'client.already_exists': {
      es: 'Ya existe un cliente con el código "{code}"',
      en: 'A client with code "{code}" already exists',
      zh: '已存在代码为 "{code}" 的客户',
    },
    'client.created_successfully': {
      es: 'Cliente creado exitosamente',
      en: 'Client created successfully',
      zh: '客户创建成功',
    },
    'client.updated_successfully': {
      es: 'Cliente actualizado exitosamente',
      en: 'Client updated successfully',
      zh: '客户更新成功',
    },
    'client.deleted_successfully': {
      es: 'Cliente eliminado exitosamente',
      en: 'Client deleted successfully',
      zh: '客户删除成功',
    },
    'client.cannot_delete_in_use': {
      es: 'No se puede eliminar el cliente porque tiene historial (Facturas: {invoiceCount}, Retiros: {withdrawalCount}, Cotizaciones: {quotationCount}).',
      en: 'Cannot delete client because it has history (Invoices: {invoiceCount}, Sales: {withdrawalCount}, Quotations: {quotationCount}).',
      zh: '无法删除该客户，因为它有历史记录（发票：{invoiceCount}，销售：{withdrawalCount}，报价：{quotationCount}）。',
    },
    'reception.fefo_requires_expiration_date': {
      es: 'El producto usa estrategia FEFO. La fecha de vencimiento es obligatoria.',
      en: 'The product uses FEFO strategy. Expiration date is required.',
      zh: '该产品使用 FEFO 策略，必须填写到期日期。',
    },
    'client.pack_not_configured': {
      es: 'No hay un pack activo configurado para importar clientes.',
      en: 'No active pack configured to import clients.',
      zh: '未配置用于导入客户的活跃包。',
    },
    'client.pack_list_not_supported': {
      es: 'El pack activo no soporta listar clientes para importación.',
      en: 'The active pack does not support listing customers for import.',
      zh: '活跃包不支持列出客户以供导入。',
    },
    'client.pack_delete_error': {
      es: 'Error al eliminar el cliente en el sistema del PAC: {error}',
      en: 'Error deleting client from PAC system: {error}',
      zh: '在 PAC 系统中删除客户时出错：{error}',
    },

    // Product pack messages
    'product.pack_not_configured': {
      es: 'No hay un pack activo configurado para importar productos.',
      en: 'No active pack configured to import products.',
      zh: '未配置用于导入产品的活跃包。',
    },
    'product.pack_list_not_supported': {
      es: 'El pack activo no soporta listar productos para importación.',
      en: 'The active pack does not support listing products for import.',
      zh: '活跃包不支持列出产品以供导入。',
    },
    'product.pack_not_supported': {
      es: 'El pack activo no soporta operaciones de productos.',
      en: 'The active pack does not support product operations.',
      zh: '活跃包不支持产品操作。',
    },

    // Certification pack messages
    'pack.not_found': {
      es: 'No se encontró un pack de certificación activo.',
      en: 'No active certification pack found.',
      zh: '未找到活跃的认证包。',
    },
    'pack.cannot_set_inactive': {
      es: 'No se puede establecer un pack inactivo como predeterminado.',
      en: 'Cannot set an inactive pack as default.',
      zh: '无法将非活跃包设置为默认。',
    },
    'pack.id_not_found': {
      es: 'Paquete de certificación con ID {id} no encontrado',
      en: 'Certification pack with ID {id} not found',
      zh: '未找到 ID 为 {id} 的认证包',
    },
    'pack.no_active_found': {
      es: 'No hay un pack de certificación activo configurado.',
      en: 'No active certification pack configured.',
      zh: '未配置活跃的认证包。',
    },

    // Purchase order messages
    'purchase_order.product_not_found': {
      es: 'Producto no encontrado',
      en: 'Product not found',
      zh: '产品未找到',
    },
    'purchase_order.cannot_cancel_completed': {
      es: 'No se puede cancelar una orden de compra completada.',
      en: 'Cannot cancel a completed purchase order.',
      zh: '无法取消已完成的采购订单。',
    },

    // Invoice payment messages
    'invoice_payment.cannot_pay_cancelled': {
      es: 'No se puede registrar un pago en una factura cancelada.',
      en: 'Cannot register payment on a cancelled invoice.',
      zh: '无法在已取消的发票上登记付款。',
    },

    
    // Subscription messages
    'subscription.no_active_plan': {
      es: 'No se encontró un plan activo.',
      en: 'No active plan found.',
      zh: '未找到活跃计划。',
    },
    'subscription.not_found': {
      es: 'Suscripción no encontrada.',
      en: 'Subscription not found.',
      zh: '订阅未找到。',
    },
    'subscription.already_active': {
      es: 'La suscripción ya está activa.',
      en: 'Subscription is already active.',
      zh: '订阅已处于活跃状态。',
    },

    // Purchase order extended messages
    'purchase_order.not_found': {
      es: 'Orden de compra no encontrada.',
      en: 'Purchase order not found.',
      zh: '采购订单未找到。',
    },
    'purchase_order.code_exists': {
      es: 'Ya existe una orden de compra con este código.',
      en: 'Purchase order code already exists.',
      zh: '该代码的采购订单已存在。',
    },
    'purchase_order.provider_not_found': {
      es: 'Proveedor no encontrado.',
      en: 'Provider not found.',
      zh: '供应商未找到。',
    },
    'purchase_order.warehouse_not_found': {
      es: 'Almacén no encontrado.',
      en: 'Warehouse not found.',
      zh: '仓库未找到。',
    },
    'purchase_order.detail_not_found': {
      es: 'Detalle de orden de compra no encontrado.',
      en: 'Purchase order detail not found.',
      zh: '采购订单明细未找到。',
    },
    'purchase_order.not_pending': {
      es: 'La orden de compra no está en estado pendiente.',
      en: 'Purchase order is not in pending status.',
      zh: '采购订单不处于待处理状态。',
    },

    // Invoice extended messages
    'invoice.not_found': {
      es: 'Factura no encontrada.',
      en: 'Invoice not found.',
      zh: '发票未找到。',
    },
    'invoice.detail_not_found': {
      es: 'Detalle de factura no encontrado.',
      en: 'Invoice detail not found.',
      zh: '发票明细未找到。',
    },
    'invoice.already_paid': {
      es: 'La factura ya está completamente pagada.',
      en: 'Invoice is already fully paid.',
      zh: '发票已全额付清。',
    },
    'invoice.must_be_stamped': {
      es: 'La factura debe estar timbrada (tener UUID CFDI) antes de registrar pagos.',
      en: 'Invoice must be stamped (have a CFDI UUID) before registering payments.',
      zh: '在登记付款之前，发票必须已盖章（具有 CFDI UUID）。',
    },
    'invoice.pac_no_complement': {
      es: 'El PAC activo no soporta complementos de pago.',
      en: 'Active PAC does not support payment complements.',
      zh: '活跃 PAC 不支持付款补充。',
    },
    'invoice.pac_no_global': {
      es: 'El PAC activo no soporta factura global.',
      en: 'Active PAC does not support global invoice.',
      zh: '活跃 PAC 不支持全局发票。',
    },
    'invoice.error_generating_cfdi': {
      es: 'Error al generar el CFDI.',
      en: 'Error generating CFDI.',
      zh: '生成 CFDI 时出错。',
    },
    'invoice.payment_already_cancelled': {
      es: 'El complemento de pago ya está cancelado.',
      en: 'Payment complement is already cancelled.',
      zh: '付款补充已取消',
    },
    'invoice.product_not_found': {
      es: 'Producto {id} no encontrado.',
      en: 'Product {id} not found.',
      zh: '产品 {id} 未找到。',
    },
    'invoice.global_period_required': {
      es: 'Debe enviar withdrawal_ids o from y to para el periodo.',
      en: 'You must send withdrawal_ids or from and to for the period.',
      zh: '您必须发送 withdrawal_ids 或该期间的 from 和 to。',
    },
    'invoice.no_withdrawals_period': {
      es: 'No hay ventas cerradas sin facturar en el periodo indicado.',
      en: 'There are no closed unbilled sales in the indicated period.',
      zh: '指定期间内没有已关闭且未开票的销售。',
    },
    'invoice.no_clients_global': {
      es: 'No hay clientes en el sistema; se requiere al menos uno para la factura global.',
      en: 'There are no clients in the system; at least one is required for the global invoice.',
      zh: '系统中没有客户；全局发票至少需要一个客户。',
    },
    'invoice.cannot_cancel_with_payments': {
      es: 'No se puede cancelar la factura porque tiene {count} complemento(s) de pago timbrado(s). Cancela los complementos de pago primero.',
      en: 'Cannot cancel the invoice because it has {count} stamped payment complement(s). Cancel the payment complements first.',
      zh: '无法取消发票，因为它有 {count} 个已盖章的付款补充。请先取消付款补充。',
    },
    'invoice.not_generated_pack': {
      es: 'La factura no ha sido generada en el paquete de certificación.',
      en: 'The invoice has not been generated in the certification pack.',
      zh: '发票尚未在认证包中生成。',
    },
    'invoice.cancel_error': {
      es: 'Error al cancelar el CFDI.',
      en: 'Error canceling CFDI.',
      zh: '取消 CFDI 时出错',
    },

    // Withdrawal extended messages
    'withdrawal.no_active_credit': {
      es: 'El cliente no tiene crédito activo.',
      en: 'The client does not have active credit.',
      zh: '该客户没有有效信用额度。',
    },
    'withdrawal.warehouse_required': {
      es: 'El almacén es requerido para productos tangibles.',
      en: 'Warehouse is required for tangible products.',
      zh: '有形产品需要指定仓库。',
    },
    'withdrawal.already_returned': {
      es: 'La salida ya fue devuelta.',
      en: 'Withdrawal is already returned.',
      zh: '该出库单已退货。',
    },
    'withdrawal.detail_not_found_after_creation': {
      es: 'No se encontró el detalle de salida después de crearlo.',
      en: 'Withdrawal detail not found after creation.',
      zh: '创建后未找到出库明细。',
    },

    // Notification messages
    'notification.not_found': {
      es: 'Notificación no encontrada.',
      en: 'Notification not found.',
      zh: '通知未找到。',
    },

    // Surrogate messages
    'surrogate.start_number_invalid': {
      es: 'El número inicial debe ser mayor a 0.',
      en: 'Start number must be greater than 0.',
      zh: '起始编号必须大于 0。',
    },

    // Pack/PAC technical messages
    'pack.api_key_not_configured': {
      es: 'La clave API del PAC no está configurada.',
      en: 'PAC API key not configured.',
      zh: 'PAC API 密钥未配置。',
    },
    'pack.error_generating_cfdi': {
      es: 'Error al generar el CFDI con el PAC.',
      en: 'Error generating CFDI with PAC.',
      zh: '通过 PAC 生成 CFDI 时出错。',
    },
    'pack.error_cancelling_cfdi': {
      es: 'Error al cancelar el CFDI con el PAC.',
      en: 'Error cancelling CFDI with PAC.',
      zh: '通过 PAC 取消 CFDI 时出错。',
    },
    'pack.error_downloading_pdf': {
      es: 'Error al descargar el PDF del PAC.',
      en: 'Error downloading PDF from PAC.',
      zh: '从 PAC 下载 PDF 时出错。',
    },
    'pack.error_downloading_xml': {
      es: 'Error al descargar el XML del PAC.',
      en: 'Error downloading XML from PAC.',
      zh: '从 PAC 下载 XML 时出错。',
    },
    'pack.business_uuid_not_configured': {
      es: 'El UUID de negocio de Factura Green no está configurado.',
      en: 'Factura Green business UUID not configured.',
      zh: 'Factura Green 业务 UUID 未配置。',
    },
    'pack.api_key_not_configured_fg': {
      es: 'La clave API de Factura Green no está configurada.',
      en: 'Factura Green API key not configured.',
      zh: 'Factura Green API 密钥未配置。',
    },
    'pack.customer_not_synced': {
      es: 'El cliente no está sincronizado con Factura Green. Sincronízalo primero.',
      en: 'Customer not synced with Factura Green. Please sync first.',
      zh: '客户未与 Factura Green 同步。请先进行同步。',
    },
    'pack.product_not_synced': {
      es: 'El producto "{name}" no está sincronizado con Factura Green. Sincronízalo primero.',
      en: 'Product "{name}" not synced with Factura Green. Please sync products first.',
      zh: '产品 "{name}" 未与 Factura Green 同步。请先同步产品。',
    },
    'pack.error_creating_customer': {
      es: 'Error al crear cliente en Factura Green',
      en: 'Error creating customer in Factura Green',
      zh: '在 Factura Green 中创建客户时出错',
    },
    'pack.error_updating_customer': {
      es: 'Error al actualizar cliente en Factura Green',
      en: 'Error updating customer in Factura Green',
      zh: '在 Factura Green 中更新客户时出错',
    },
    'pack.error_listing_customers': {
      es: 'Error al listar clientes de Factura Green',
      en: 'Error listing customers from Factura Green',
      zh: '从 Factura Green 列出客户时出错',
    },
    'pack.error_deleting_customer': {
      es: 'Error al eliminar cliente en Factura Green',
      en: 'Error deleting customer in Factura Green',
      zh: '在 Factura Green 中删除客户时出错',
    },
    'pack.error_creating_product': {
      es: 'Error al crear producto en Factura Green',
      en: 'Error creating product in Factura Green',
      zh: '在 Factura Green 中创建产品时出错',
    },
    'pack.error_updating_product': {
      es: 'Error al actualizar producto en Factura Green',
      en: 'Error updating product in Factura Green',
      zh: '在 Factura Green 中更新产品时出错',
    },
    'pack.error_listing_products': {
      es: 'Error al listar productos de Factura Green',
      en: 'Error listing products from Factura Green',
      zh: '从 Factura Green 列出产品时出错',
    },
    'pack.error_finding_product': {
      es: 'Error al buscar producto por SKU en Factura Green',
      en: 'Error finding product by SKU in Factura Green',
      zh: '在 Factura Green 中按 SKU 查找产品时出错',
    },
    'pack.error_global_invoice': {
      es: 'Error al emitir la factura global en Factura Green',
      en: 'Error generating global invoice in Factura Green',
      zh: '在 Factura Green 中生成全局发票时出错',
    },
    'pack.error_payment_complement': {
      es: 'Error al generar complemento de pago en Factura Green',
      en: 'Error generating payment complement in Factura Green',
      zh: '在 Factura Green 中生成付款补充时出错',
    },
    'pack.error_canceling_payment_complement': {
      es: 'Error al cancelar complemento de pago en Factura Green',
      en: 'Error canceling payment complement in Factura Green',
      zh: '在 Factura Green 中取消付款补充时出错',
    },
    'pack.error_getting_cfdi_status': {
      es: 'Error al obtener estado del CFDI de Factura Green',
      en: 'Error getting CFDI status from Factura Green',
      zh: '从 Factura Green 获取 CFDI 状态时出错',
    },

    // FacturaAPI messages
    'pack.api_key_not_configured_fapi': {
      es: 'La clave API de FacturaAPI no está configurada.',
      en: 'FacturaAPI API key not configured.',
      zh: 'FacturaAPI API 密钥未配置。',
    },
    'pack.error_generating_cfdi_fapi': {
      es: 'Error al generar el CFDI con FacturaAPI',
      en: 'Error generating CFDI with FacturaAPI',
      zh: '通过 FacturaAPI 生成 CFDI 时出错',
    },
    'pack.error_canceling_cfdi_fapi': {
      es: 'Error al cancelar el CFDI con FacturaAPI',
      en: 'Error canceling CFDI with FacturaAPI',
      zh: '通过 FacturaAPI 取消 CFDI 时出错',
    },
    'pack.error_getting_cfdi_status_fapi': {
      es: 'Error al obtener estado del CFDI de FacturaAPI',
      en: 'Error getting CFDI status from FacturaAPI',
      zh: '从 FacturaAPI 获取 CFDI 状态时出错',
    },
    'pack.error_payment_complement_fapi': {
      es: 'Error al generar complemento de pago con FacturaAPI: {error}',
      en: 'Error generating payment complement with FacturaAPI: {error}',
      zh: '通过 FacturaAPI 生成付款补充时出错：{error}',
    },
    'pack.error_canceling_payment_complement_fapi': {
      es: 'Error al cancelar complemento de pago con FacturaAPI: {error}',
      en: 'Error canceling payment complement with FacturaAPI: {error}',
      zh: '通过 FacturaAPI 取消付款补充时出错：{error}',
    },
    'pack.fapi_id_or_uuid_required': {
      es: 'No se proporcionó un ID o UUID válido para la factura original',
      en: 'No valid ID or UUID provided for the original invoice',
      zh: '未提供原始发票的有效 ID 或 UUID',
    },
    'pack.fapi_original_invoice_not_found': {
      es: 'Factura original o cliente no encontrado en Facturapi (ID: {id}). Verifica que la factura haya sido emitida con el mismo API Key.',
      en: 'Original invoice or customer not found in Facturapi (ID: {id}). Verify that the invoice was issued with the same API Key.',
      zh: '在 Facturapi 中未找到原始发票或客户（ID：{id}）。请确认发票是使用相同的 API 密钥开具的。',
    },

    // Quotation messages
    'quotation.not_found': {
      es: 'Cotización con ID {id} no encontrada.',
      en: 'Quotation with ID {id} not found.',
      zh: '未找到 ID 为 {id} 的报价单。',
    },
    'quotation.client_not_found': {
      es: 'Cliente con ID {clientId} no encontrado.',
      en: 'Client with ID {clientId} not found.',
      zh: '未找到 ID 为 {clientId} 的客户。',
    },
    'quotation.warehouse_not_found': {
      es: 'Almacén con ID {warehouseId} no encontrado.',
      en: 'Warehouse with ID {warehouseId} not found.',
      zh: '未找到 ID 为 {warehouseId} 的仓库。',
    },
    'quotation.product_not_found': {
      es: 'Producto con ID {productId} no encontrado.',
      en: 'Product with ID {productId} not found.',
      zh: '未找到 ID 为 {productId} 的产品。',
    },
    'quotation.detail_not_found': {
      es: 'Detalle de cotización no encontrado.',
      en: 'Quotation detail not found.',
      zh: '报价单明细未找到。',
    },
    'quotation.already_converted': {
      es: 'La cotización ya fue convertida a venta.',
      en: 'The quotation has already been converted to a sale.',
      zh: '该报价单已转换为销售单。',
    },
    'quotation.no_products_to_convert': {
      es: 'La cotización no tiene productos para convertir.',
      en: 'The quotation has no products to convert.',
      zh: '该报价单没有可转换的产品。',
    },
    'quotation.converted_successfully': {
      es: 'Cotización {quotationCode} convertida a venta {saleCode} exitosamente.',
      en: 'Quotation {quotationCode} successfully converted to sale {saleCode}.',
      zh: '报价单 {quotationCode} 已成功转换为销售单 {saleCode}。',
    },

    // General messages
    'general.onboarding_completed_successfully': {
      es: 'Onboarding completado exitosamente',
      en: 'Onboarding completed successfully',
      zh: 'Onboarding 完成成功',
    },
    'general.send_message_success': {
      es: 'Mensaje enviado exitosamente',
      en: 'Message sent successfully',
      zh: '消息发送成功',
    },
    'general.success': {
      es: 'Operación exitosa',
      en: 'Operation successful',
      zh: '操作成功',
    },
    'general.error': {
      es: 'Error en la operación',
      en: 'Operation error',
      zh: '操作错误',
    },
    'general.validation_error': {
      es: 'Error de validación',
      en: 'Validation error',
      zh: '验证错误',
    },
    'general.server_error': {
      es: 'Error interno del servidor',
      en: 'Internal server error',
      zh: '服务器内部错误',
    },
    'general.no_file': {
      es: 'No se recibió ningún archivo',
      en: 'No file received',
      zh: '未收到文件',
    },
    'general.invalid_extension_csv': {
      es: 'Solo se aceptan archivos CSV (.csv, .txt)',
      en: 'Only CSV files (.csv, .txt) are allowed',
      zh: '仅允许 CSV 文件 (.csv, .txt)',
    },
    'general.empty_file': {
      es: 'El archivo no contiene filas de datos',
      en: 'The file contains no data rows',
      zh: '文件不包含数据行',
    },
    'import.queued_message': {
      es: 'Importación de {count} {type} en proceso. Recibirás una notificación cuando termine.',
      en: 'Import of {count} {type} in progress. You will receive a notification when finished.',
      zh: '{count} 个 {type} 的导入正在处理中。完成后您将收到通知。',
    },
    'general.not_found': {
      es: 'No encontrado',
      en: 'Not found',
      zh: '未找到',
    },
    'general.only_images_allowed': {
      es: 'Solo se permiten archivos de imagen',
      en: 'Only image files are allowed',
      zh: '只允许上传图像文件',
    },
    'general.file_not_found': {
      es: 'Archivo no encontrado',
      en: 'File not found',
      zh: '文件未找到',
    },
    'shipment.org_not_found': {
      es: 'Organización no encontrada',
      en: 'Organization not found',
      zh: '未找到组织',
    },
    'shipment.tenant_required': {
      es: 'Tenant requerido',
      en: 'Tenant required',
      zh: 'Tenant required',
    },
    'auth.welcome_title': {
      es: 'Bienvenido a Nitro',
      en: 'Welcome to Nitro',
      zh: 'Welcome to Nitro',
    },
    'auth.welcome_message': {
      es: '¡Hola, {name}! Te damos la bienvenida a Nitro. Estamos emocionados de tenerte con nosotros y ayudarte a potenciar tu negocio.',
      en: 'Hello, {name}! Welcome to Nitro. We are excited to have you with us and help you boost your business.',
      zh: 'Hello, {name}! Welcome to Nitro. We are excited to have you with us and help you boost your business.',
    },
    'auth.activate_button': {
      es: 'Activar mi cuenta',
      en: 'Activate my account',
      zh: 'Activate my account',
    },
    'auth.activate_instructions': {
      es: 'Para comenzar a explorar todas las funciones, por favor activa tu cuenta haciendo clic en el botón de abajo:',
      en: 'To start exploring all the features, please activate your account by clicking the button below:',
      zh: '要开始探索所有功能，请点击下方按钮激活您的账户：',
    },
    'auth.copy_link_text': {
      es: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      en: 'If the button doesn\'t work, copy and paste this link into your browser:',
      zh: '如果按钮无效，请将以下链接复制并粘贴到浏览器中：',
    },
    'auth.email_subject': {
      es: 'Activa tu cuenta de Nitro',
      en: 'Activate your Nitro account',
      zh: '激活您的 Nitro 账户',
    },
    'auth.activation_success_title': {
      es: '¡Bienvenido a Nitro!',
      en: 'Welcome to Nitro!',
      zh: '欢迎使用 Nitro！',
    },
    'auth.account_activated': {
      es: 'CUENTA ACTIVADA',
      en: 'ACCOUNT ACTIVATED',
      zh: '账户已激活',
    },
    'auth.activation_welcome': {
      es: '¡Hola, {name}!',
      en: 'Hello, {name}!',
      zh: '您好，{name}！',
    },
    'auth.activation_success_message': {
      es: 'Tu cuenta ha sido activada exitosamente. ¡Estamos emocionados de tenerte con nosotros!',
      en: 'Your account has been successfully activated. We are excited to have you with us!',
      zh: '您的账户已成功激活。我们很高兴您加入我们！',
    },
    'auth.trial_period_activated': {
      es: 'Período de Prueba Activado',
      en: 'Trial Period Activated',
      zh: '试用期已激活',
    },
    'auth.trial_duration': {
      es: 'Duración',
      en: 'Duration',
      zh: '时长',
    },
    'auth.trial_ends': {
      es: 'Finaliza',
      en: 'Ends',
      zh: '到期日',
    },
    'auth.trial_access': {
      es: 'Acceso',
      en: 'Access',
      zh: '访问权限',
    },
    'auth.trial_all_features': {
      es: 'Todas las funcionalidades',
      en: 'All features',
      zh: '所有功能',
    },
    'auth.trial_description': {
      es: 'Durante estos 7 días podrás explorar todas las características de Nitro sin ningún costo.',
      en: 'During these 7 days you can explore all Nitro features at no cost.',
      zh: '在这 7 天内，您可以免费探索 Nitro 的所有功能。',
    },
    'auth.single_plan_title': {
      es: 'Plan Único - Todas las Características',
      en: 'Single Plan - All Features',
      zh: '单一套餐 - 全部功能',
    },
    'auth.plan_price': {
      es: '$700 <span style="font-size: 18px; color: #CBD5E1;">MXN/mes</span>',
      en: '$700 <span style="font-size: 18px; color: #CBD5E1;">MXN/month</span>',
      zh: '$700 <span style="font-size: 18px; color: #CBD5E1;">MXN/月</span>',
    },
    'auth.unlimited_users': {
      es: 'Usuarios ilimitados',
      en: 'Unlimited users',
      zh: '无限用户',
    },
    'auth.unlimited_warehouses': {
      es: 'Almacenes ilimitados',
      en: 'Unlimited warehouses',
      zh: '无限仓库',
    },
    'auth.unlimited_products': {
      es: 'Productos ilimitados',
      en: 'Unlimited products',
      zh: '无限产品',
    },
    'auth.inventory_strategies': {
      es: 'Todas las estrategias de inventario (FIFO, AVERAGE, FEFO)',
      en: 'All inventory strategies (FIFO, AVERAGE, FEFO)',
      zh: '所有库存策略（FIFO、AVERAGE、FEFO）',
    },
    'auth.credit_management': {
      es: 'Gestión de crédito a clientes',
      en: 'Customer credit management',
      zh: '客户信用管理',
    },
    'auth.electronic_invoicing': {
      es: 'Facturación electrónica (CFDI)',
      en: 'Electronic invoicing (CFDI)',
      zh: '电子开票（CFDI）',
    },
    'auth.advanced_reports': {
      es: 'Reportes avanzados y análisis',
      en: 'Advanced reports and analytics',
      zh: '高级报表与分析',
    },
    'auth.api_webhooks': {
      es: 'API REST y Webhooks',
      en: 'REST API and Webhooks',
      zh: 'REST API 与 Webhooks',
    },
    'auth.priority_support': {
      es: 'Soporte prioritario',
      en: 'Priority support',
      zh: '优先支持',
    },
    'auth.after_trial_message': {
      es: 'Después del período de prueba, necesitarás activar tu suscripción para continuar usando Nitro.',
      en: 'After the trial period, you will need to activate your subscription to continue using Nitro.',
      zh: '试用期结束后，您需要激活订阅才能继续使用 Nitro。',
    },
    'auth.start_using_nitro': {
      es: 'Comenzar a usar Nitro',
      en: 'Start using Nitro',
      zh: '开始使用 Nitro',
    },
    'auth.trial_tip': {
      es: 'Tip: Te enviaremos recordatorios antes de que finalice tu período de prueba.',
      en: 'Tip: We will send you reminders before your trial period ends.',
      zh: '提示：试用期结束前我们会向您发送提醒。',
    },
    'auth.activation_email_subject': {
      es: '¡Bienvenido a Nitro! Tu cuenta está activa',
      en: 'Welcome to Nitro! Your account is active',
      zh: '欢迎使用 Nitro！您的账户已激活',
    },
    'auth.reset_password_title': {
      es: 'Restablecer Contraseña - Nitro',
      en: 'Reset Password - Nitro',
      zh: '重置密码 - Nitro',
    },
    'auth.reset_password_subject': {
      es: 'Restablecer contraseña - Nitro',
      en: 'Reset password - Nitro',
      zh: '重置密码 - Nitro',
    },
    'auth.reset_password_heading': {
      es: 'Restablecer Contraseña',
      en: 'Reset Password',
      zh: '重置密码',
    },
    'auth.reset_greeting': {
      es: 'Hola,',
      en: 'Hello,',
      zh: '您好，',
    },
    'auth.reset_instructions': {
      es: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si no hiciste esta solicitud, puedes ignorar este correo.',
      en: 'We have received a request to reset your account password. If you didn\'t make this request, you can ignore this email.',
      zh: '我们收到了重置您账户密码的请求。如果您未发起此请求，请忽略此邮件。',
    },
    'auth.reset_button': {
      es: 'Restablecer Contraseña',
      en: 'Reset Password',
      zh: '重置密码',
    },
    'auth.reset_expiry': {
      es: 'Este enlace expirará en 1 hora por razones de seguridad.',
      en: 'This link will expire in 1 hour for security reasons.',
      zh: '出于安全原因，此链接将在 1 小时后失效。',
    },
    'auth.reset_copy_link': {
      es: 'Si tienes problemas con el botón, copia y pega el siguiente enlace en tu navegador:',
      en: 'If you have trouble with the button, copy and paste the following link into your browser:',
      zh: '如果按钮无效，请将以下链接复制并粘贴到浏览器中：',
    },
    'auth.footer_text': {
      es: 'El motor de tu negocio.<br>Todos los derechos reservados.',
      en: 'The engine of your business.<br>All rights reserved.',
      zh: '您业务的引擎。<br>保留所有权利。',
    },
    'auth.ignore_email': {
      es: 'Este enlace de activación es válido por las próximas <strong>72 horas</strong> (3 días).<br><br>Si no solicitaste esta cuenta, puedes ignorar este correo sin ningún problema.',
      en: 'This activation link is valid for the next <strong>72 hours</strong> (3 days).<br><br>If you didn\'t request this account, you can ignore this email without any problem.',
      zh: '此激活链接在接下来的 <strong>72 小时</strong>（3 天）内有效。<br><br>如果您未申请此账户，请忽略此邮件。',
    },

    // HR Module messages
    'hr.department.not_found': {
      es: 'Departamento no encontrado',
      en: 'Department not found',
      zh: '未找到部门',
    },
    'hr.position.not_found': {
      es: 'Puesto no encontrado',
      en: 'Position not found',
      zh: '未找到职位',
    },
    'hr.employee.not_found': {
      es: 'Empleado no encontrado',
      en: 'Employee not found',
      zh: '未找到员工',
    },
    'hr.attendance.not_found': {
      es: 'Registro de asistencia no encontrado',
      en: 'Attendance record not found',
      zh: '未找到考勤记录',
    },
    'hr.leave_request.not_found': {
      es: 'Solicitud de ausencia no encontrada',
      en: 'Leave request not found',
      zh: '未找到请假申请',
    },
    'hr.payroll.not_found': {
      es: 'Registro de nómina no encontrado',
      en: 'Payroll record not found',
      zh: '未找到工资记录',
    },
    'hr.document.not_found': {
      es: 'Documento no encontrado',
      en: 'Document not found',
      zh: '未找到文档',
    },
  };

  constructor(
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
    private userContextService: UserContextService,
  ) {}

  /**
   * Translates a message to the language of the specified user
   * @param key - Message key
   * @param userId - ID of the authenticated user
   * @param params - Parameters to replace in the message
   * @returns Translated message
   */
  async translate(
    key: string,
    userId?: string,
    params: Record<string, any> = {},
  ): Promise<string> {
    // Get the user's language code
    const languageCode = userId
      ? await this.userContextService.getUserLanguageCode(userId)
      : 'en';

    // Get the translated message
    const message = this.getTranslation(key, languageCode);

    // Replace parameters in the message
    return this.replaceParams(message, params);
  }

  /**
   * Translates a message to the specified language (legacy method for compatibility)
   * @param key - Message key
   * @param languageCode - Language code (e.g., 'es', 'en', 'zh')
   * @param params - Parameters to replace in the message
   * @returns Translated message
   */
  async translateWithLanguage(
    key: string,
    languageCode?: string,
    params: Record<string, any> = {},
  ): Promise<string> {
    // If no language is specified, use English by default
    if (!languageCode) {
      languageCode = 'en';
    }

    // Check if the language exists in the database
    const language = await this.languageRepository.findOne({
      where: { code: languageCode },
    });

    // If the language doesn't exist or is not active, use English
    if (!language) {
      languageCode = 'en';
    }

    // Get the translated message
    const message = this.getTranslation(key, languageCode);

    // Replace parameters in the message
    return this.replaceParams(message, params);
  }

  /**
   * Returns the translation for a specific key
   * @param key - Message key
   * @param languageCode - Language code
   * @returns Translated message, or the key if not found
   */
  private getTranslation(key: string, languageCode: string): string {
    const translation = this.translations[key] as
      | Record<string, string>
      | undefined;

    if (!translation) {
      return key;
    }

    return translation[languageCode] || translation['en'] || key;
  }

  /**
   * Replaces parameter placeholders in a message
   * @param message - Message containing placeholders
   * @param params - Parameters to replace
   * @returns Message with parameters substituted
   */
  private replaceParams(message: string, params: Record<string, any>): string {
    let result = message;

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return result;
  }
}
