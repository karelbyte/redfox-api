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
    },
    'user.email_not_found': {
      es: 'Usuario con email {email} no encontrado',
      en: 'User with email {email} not found',
    },
    'user.already_exists': {
      es: 'Ya existe un usuario con este email',
      en: 'A user with this email already exists',
    },
    'user.created_successfully': {
      es: 'Usuario creado exitosamente',
      en: 'User created successfully',
    },
    'user.updated_successfully': {
      es: 'Usuario actualizado exitosamente',
      en: 'User updated successfully',
    },
    'user.deleted_successfully': {
      es: 'Usuario eliminado exitosamente',
      en: 'User deleted successfully',
    },

    // Authentication messages
    'auth.invalid_credentials': {
      es: 'Credenciales inválidas',
      en: 'Invalid credentials',
    },
    'auth.token_expired': {
      es: 'Token expirado',
      en: 'Token expired',
    },
    'auth.unauthorized': {
      es: 'No autorizado',
      en: 'Unauthorized',
    },
    'auth.login_successful': {
      es: 'Inicio de sesión exitoso',
      en: 'Login successful',
    },

    // Permission messages
    'permission.not_found': {
      es: 'Permiso con ID {id} no encontrado',
      en: 'Permission with ID {id} not found',
    },
    'permission.already_exists': {
      es: 'Ya existe un permiso con este código',
      en: 'A permission with this code already exists',
    },
    'permission.created_successfully': {
      es: 'Permiso creado exitosamente',
      en: 'Permission created successfully',
    },
    'permission.updated_successfully': {
      es: 'Permiso actualizado exitosamente',
      en: 'Permission updated successfully',
    },
    'permission.deleted_successfully': {
      es: 'Permiso eliminado exitosamente',
      en: 'Permission deleted successfully',
    },

    // Product messages
    'product.not_found': {
      es: 'Producto con ID {id} no encontrado',
      en: 'Product with ID {id} not found',
    },
    'product.slug_already_exists': {
      es: 'Ya existe un producto con el slug "{slug}"',
      en: 'A product with slug "{slug}" already exists',
    },
    'product.sku_already_exists': {
      es: 'Ya existe un producto con el SKU "{sku}"',
      en: 'A product with SKU "{sku}" already exists',
    },
    'product.created_successfully': {
      es: 'Producto creado exitosamente',
      en: 'Product created successfully',
    },
    'product.updated_successfully': {
      es: 'Producto actualizado exitosamente',
      en: 'Product updated successfully',
    },
    'product.deleted_successfully': {
      es: 'Producto eliminado exitosamente',
      en: 'Product deleted successfully',
    },
    'product.cannot_delete_in_use': {
      es: 'No se puede eliminar el producto "{name}" porque está siendo usado en {inventoryCount} inventario(s) y {warehouseOpeningCount} apertura(s) de almacén. Primero debe eliminar estos registros.',
      en: 'Cannot delete product "{name}" because it is being used in {inventoryCount} inventory record(s) and {warehouseOpeningCount} warehouse opening(s). First, you must delete these records.',
    },

    // Provider messages
    'provider.not_found': {
      es: 'Proveedor con ID {id} no encontrado',
      en: 'Provider with ID {id} not found',
    },
    'provider.created_successfully': {
      es: 'Proveedor creado exitosamente',
      en: 'Provider created successfully',
    },
    'provider.updated_successfully': {
      es: 'Proveedor actualizado exitosamente',
      en: 'Provider updated successfully',
    },
    'provider.deleted_successfully': {
      es: 'Proveedor eliminado exitosamente',
      en: 'Provider deleted successfully',
    },

    // Reception messages
    'reception.not_found': {
      es: 'Recepción con ID {id} no encontrada',
      en: 'Reception with ID {id} not found',
    },
    'reception.detail_not_found': {
      es: 'Detalle de recepción con ID {detailId} no encontrado en la recepción {receptionId}',
      en: 'Reception detail with ID {detailId} not found in reception {receptionId}',
    },
    'reception.provider_not_found': {
      es: 'Proveedor con ID {providerId} no encontrado',
      en: 'Provider with ID {providerId} not found',
    },
    'reception.warehouse_not_found': {
      es: 'Almacén con ID {warehouseId} no encontrado',
      en: 'Warehouse with ID {warehouseId} not found',
    },
    'reception.product_not_found': {
      es: 'Producto con ID {productId} no encontrado',
      en: 'Product with ID {productId} not found',
    },
    'reception.already_closed': {
      es: 'La recepción ya está cerrada',
      en: 'The reception is already closed',
    },
    'reception.no_products_to_transfer': {
      es: 'La recepción no tiene productos para transferir',
      en: 'The reception has no products to transfer',
    },
    'reception.closed_successfully': {
      es: 'Recepción cerrada exitosamente. {transferredProducts} productos transferidos al inventario.',
      en: 'Reception closed successfully. {transferredProducts} products transferred to inventory.',
    },
    'reception.closed_no_products': {
      es: 'Recepción cerrada exitosamente. No había productos para transferir.',
      en: 'Reception closed successfully. No products to transfer.',
    },
    'reception.created_successfully': {
      es: 'Recepción creada exitosamente',
      en: 'Reception created successfully',
    },
    'reception.updated_successfully': {
      es: 'Recepción actualizada exitosamente',
      en: 'Reception updated successfully',
    },
    'reception.deleted_successfully': {
      es: 'Recepción eliminada exitosamente',
      en: 'Reception deleted successfully',
    },

    // RolePermission messages
    'role_permission.already_exists': {
      es: 'Ya existe esta relación entre rol y permiso',
      en: 'This role-permission relationship already exists',
    },
    'role_permission.not_found': {
      es: 'Relación rol-permiso con ID {id} no encontrada',
      en: 'Role-permission relationship with ID {id} not found',
    },
    'role_permission.relationship_not_found': {
      es: 'Relación rol-permiso no encontrada',
      en: 'Role-permission relationship not found',
    },
    'role_permission.role_not_found': {
      es: 'Rol con ID {roleId} no encontrado',
      en: 'Role with ID {roleId} not found',
    },
    'role_permission.permissions_not_found': {
      es: 'Permisos no encontrados: {missingIds}',
      en: 'Permissions not found: {missingIds}',
    },
    'role_permission.permission_ids_array_required': {
      es: 'permissionIds debe ser un array',
      en: 'permissionIds must be an array',
    },
    'role_permission.permission_ids_empty': {
      es: 'permissionIds no puede estar vacío',
      en: 'permissionIds cannot be empty',
    },
    'role_permission.created_successfully': {
      es: 'Relación rol-permiso creada exitosamente',
      en: 'Role-permission relationship created successfully',
    },
    'role_permission.assigned_successfully': {
      es: 'Permisos asignados al rol exitosamente',
      en: 'Permissions assigned to role successfully',
    },
    'role_permission.updated_successfully': {
      es: 'Permisos del rol actualizados exitosamente',
      en: 'Role permissions updated successfully',
    },
    'role_permission.deleted_successfully': {
      es: 'Relación rol-permiso eliminada exitosamente',
      en: 'Role-permission relationship deleted successfully',
    },

    // CashRegister messages
    'cash_register.not_found': {
      es: 'Caja registradora con ID {id} no encontrada',
      en: 'Cash register with ID {id} not found',
    },
    'cash_register.already_exists': {
      es: 'Ya existe una caja registradora con el código {code}',
      en: 'Cash register with code {code} already exists',
    },
    'cash_register.already_open': {
      es: 'Ya hay una caja registradora abierta',
      en: 'There is already an open cash register',
    },
    'cash_register.already_closed': {
      es: 'La caja registradora ya está cerrada',
      en: 'The cash register is already closed',
    },
    'cash_register.created_successfully': {
      es: 'Caja registradora creada exitosamente',
      en: 'Cash register created successfully',
    },
    'cash_register.opened_successfully': {
      es: 'Caja registradora abierta exitosamente',
      en: 'Cash register opened successfully',
    },
    'cash_register.closed_successfully': {
      es: 'Caja registradora cerrada exitosamente',
      en: 'Cash register closed successfully',
    },
    'cash_register.updated_successfully': {
      es: 'Caja registradora actualizada exitosamente',
      en: 'Cash register updated successfully',
    },
    'cash_register.deleted_successfully': {
      es: 'Caja registradora eliminada exitosamente',
      en: 'Cash register deleted successfully',
    },
    'cash_register.no_open_register': {
      es: 'No hay una caja registradora abierta actualmente',
      en: 'There is no open cash register currently',
    },

    // CashTransaction messages
    'cash_transaction.not_found': {
      es: 'Transacción de caja con ID {id} no encontrada',
      en: 'Cash transaction with ID {id} not found',
    },
    'cash_transaction.cash_register_not_found': {
      es: 'Caja registradora con ID {id} no encontrada',
      en: 'Cash register with ID {id} not found',
    },
    'cash_transaction.cash_register_closed': {
      es: 'No se pueden crear transacciones en una caja cerrada',
      en: 'Cannot create transactions in a closed cash register',
    },
    'cash_transaction.created_successfully': {
      es: 'Transacción de caja creada exitosamente',
      en: 'Cash transaction created successfully',
    },
    'cash_transaction.invalid_amount': {
      es: 'El monto de la transacción debe ser mayor a cero',
      en: 'Transaction amount must be greater than zero',
    },
    'cash_transaction.invalid_type': {
      es: 'Tipo de transacción no válido',
      en: 'Invalid transaction type',
    },

    // Role messages
    'role.not_found': {
      es: 'Rol con ID {id} no encontrado',
      en: 'Role with ID {id} not found',
    },
    'role.already_exists': {
      es: 'Ya existe un rol con el código "{code}"',
      en: 'A role with code "{code}" already exists',
    },
    'role.created_successfully': {
      es: 'Rol creado exitosamente',
      en: 'Role created successfully',
    },
    'role.updated_successfully': {
      es: 'Rol actualizado exitosamente',
      en: 'Role updated successfully',
    },
    'role.deleted_successfully': {
      es: 'Rol eliminado exitosamente',
      en: 'Role deleted successfully',
    },

    // Language messages
    'language.not_found': {
      es: 'Idioma con ID {id} no encontrado',
      en: 'Language with ID {id} not found',
    },
    'language.code_not_found': {
      es: 'Idioma con código {code} no encontrado',
      en: 'Language with code {code} not found',
    },
    'language.already_exists': {
      es: 'Ya existe un idioma con este código',
      en: 'A language with this code already exists',
    },
    'language.no_default_found': {
      es: 'No se encontró un idioma por defecto',
      en: 'No default language found',
    },
    'language.cannot_delete_default': {
      es: 'No se puede eliminar el idioma por defecto',
      en: 'Cannot delete the default language',
    },
    'language.created_successfully': {
      es: 'Idioma creado exitosamente',
      en: 'Language created successfully',
    },
    'language.updated_successfully': {
      es: 'Idioma actualizado exitosamente',
      en: 'Language updated successfully',
    },
    'language.deleted_successfully': {
      es: 'Idioma eliminado exitosamente',
      en: 'Language deleted successfully',
    },
    'language.set_default_successfully': {
      es: 'Idioma establecido como predeterminado exitosamente',
      en: 'Language set as default successfully',
    },

    // Brand messages
    'brand.not_found': {
      es: 'Marca con ID {id} no encontrada',
      en: 'Brand with ID {id} not found',
    },
    'brand.already_exists': {
      es: 'Ya existe una marca con el código "{code}"',
      en: 'A brand with code "{code}" already exists',
    },
    'brand.created_successfully': {
      es: 'Marca creada exitosamente',
      en: 'Brand created successfully',
    },
    'brand.updated_successfully': {
      es: 'Marca actualizada exitosamente',
      en: 'Brand updated successfully',
    },
    'brand.deleted_successfully': {
      es: 'Marca eliminada exitosamente',
      en: 'Brand deleted successfully',
    },
    'brand.cannot_delete_in_use': {
      es: 'No se puede eliminar la marca "{description}" porque está siendo usada por {count} producto(s). Primero debe cambiar o eliminar los productos que usan esta marca.',
      en: 'Cannot delete brand "{description}" because it is being used by {count} product(s). First, you must change or delete the products that use this brand.',
    },

    // Currency messages
    'currency.not_found': {
      es: 'Moneda con ID {id} no encontrada',
      en: 'Currency with ID {id} not found',
    },
    'currency.code_not_found': {
      es: 'Moneda con código {code} no encontrada',
      en: 'Currency with code {code} not found',
    },
    'currency.already_exists': {
      es: 'Ya existe una moneda con el código "{code}"',
      en: 'A currency with code "{code}" already exists',
    },
    'currency.created_successfully': {
      es: 'Moneda creada exitosamente',
      en: 'Currency created successfully',
    },
    'currency.updated_successfully': {
      es: 'Moneda actualizada exitosamente',
      en: 'Currency updated successfully',
    },
    'currency.deleted_successfully': {
      es: 'Moneda eliminada exitosamente',
      en: 'Currency deleted successfully',
    },

    // Inventory messages
    'inventory.not_found': {
      es: 'Inventario con ID {id} no encontrado',
      en: 'Inventory with ID {id} not found',
    },
    'inventory.created_successfully': {
      es: 'Inventario creado exitosamente',
      en: 'Inventory created successfully',
    },
    'inventory.updated_successfully': {
      es: 'Inventario actualizado exitosamente',
      en: 'Inventory updated successfully',
    },
    'inventory.deleted_successfully': {
      es: 'Inventario eliminado exitosamente',
      en: 'Inventory deleted successfully',
    },

    // Measurement Unit messages
    'measurement_unit.not_found': {
      es: 'Unidad de medida con ID {id} no encontrada',
      en: 'Measurement unit with ID {id} not found',
    },
    'measurement_unit.already_exists': {
      es: 'Ya existe una unidad de medida con el código "{code}"',
      en: 'A measurement unit with code "{code}" already exists',
    },
    'measurement_unit.created_successfully': {
      es: 'Unidad de medida creada exitosamente',
      en: 'Measurement unit created successfully',
    },
    'measurement_unit.updated_successfully': {
      es: 'Unidad de medida actualizada exitosamente',
      en: 'Measurement unit updated successfully',
    },
    'measurement_unit.deleted_successfully': {
      es: 'Unidad de medida eliminada exitosamente',
      en: 'Measurement unit deleted successfully',
    },
    'measurement_unit.cannot_delete_in_use': {
      es: 'No se puede eliminar la unidad de medida "{description}" porque está siendo usada por {count} producto(s). Primero debe cambiar o eliminar los productos que usan esta unidad de medida.',
      en: 'Cannot delete measurement unit "{description}" because it is being used by {count} product(s). First, you must change or delete the products that use this measurement unit.',
    },

    // Tax messages
    'tax.not_found': {
      es: 'Impuesto con ID {id} no encontrado',
      en: 'Tax with ID {id} not found',
    },
    'tax.already_exists': {
      es: 'Ya existe un impuesto con el código {code}',
      en: 'Tax with code {code} already exists',
    },
    'tax.cannot_delete_in_use': {
      es: 'No se puede eliminar el impuesto "{name}" porque está siendo usado por {count} producto(s). Primero debe cambiar o eliminar los productos que usan este impuesto.',
      en: 'Cannot delete tax "{name}" because it is being used by {count} product(s). First change or delete the products that use this tax.',
    },
    'tax.created_successfully': {
      es: 'Impuesto creado exitosamente',
      en: 'Tax created successfully',
    },
    'tax.updated_successfully': {
      es: 'Impuesto actualizado exitosamente',
      en: 'Tax updated successfully',
    },
    'tax.deleted_successfully': {
      es: 'Impuesto eliminado exitosamente',
      en: 'Tax deleted successfully',
    },
    'tax.activated_successfully': {
      es: 'Impuesto activado exitosamente',
      en: 'Tax activated successfully',
    },
    'tax.deactivated_successfully': {
      es: 'Impuesto desactivado exitosamente',
      en: 'Tax deactivated successfully',
    },

    // Category messages
    'category.not_found': {
      es: 'Categoría con ID {id} no encontrada',
      en: 'Category with ID {id} not found',
    },
    'category.slug_not_found': {
      es: 'Categoría con slug {slug} no encontrada',
      en: 'Category with slug {slug} not found',
    },
    'category.parent_not_found': {
      es: 'Categoría padre con ID {id} no encontrada',
      en: 'Parent category with ID {id} not found',
    },
    'category.already_exists': {
      es: 'Ya existe una categoría con el slug "{slug}"',
      en: 'A category with slug "{slug}" already exists',
    },
    'category.created_successfully': {
      es: 'Categoría creada exitosamente',
      en: 'Category created successfully',
    },
    'category.updated_successfully': {
      es: 'Categoría actualizada exitosamente',
      en: 'Category updated successfully',
    },
    'category.deleted_successfully': {
      es: 'Categoría eliminada exitosamente',
      en: 'Category deleted successfully',
    },
    'category.cannot_delete_in_use': {
      es: 'No se puede eliminar la categoría "{name}" porque está siendo usada por {count} producto(s). Primero debe cambiar o eliminar los productos que usan esta categoría.',
      en: 'Cannot delete category "{name}" because it is being used by {count} product(s). First, you must change or delete the products that use this category.',
    },
    'category.cannot_delete_with_children': {
      es: 'No se puede eliminar la categoría "{name}" porque tiene {count} subcategoría(s). Primero debe eliminar o mover las subcategorías.',
      en: 'Cannot delete category "{name}" because it has {count} subcategory(ies). First, you must delete or move the subcategories.',
    },
    'category.hierarchy_cycle': {
      es: 'No se puede crear un ciclo en la jerarquía de categorías',
      en: 'Cannot create a cycle in the category hierarchy',
    },
    'category.hierarchy_cycle_detected': {
      es: 'Se ha detectado un ciclo en la jerarquía de categorías',
      en: 'A cycle has been detected in the category hierarchy',
    },
    'category.cannot_deactivate_with_active_children': {
      es: 'No se puede desactivar una categoría que tiene hijos activos',
      en: 'Cannot deactivate a category that has active children',
    },
    'category.cannot_be_own_parent': {
      es: 'Una categoría no puede ser su propia categoría padre',
      en: 'A category cannot be its own parent category',
    },
    'category.cannot_change_parent_with_children': {
      es: 'No se puede cambiar la categoría padre de una categoría que tiene hijos',
      en: 'Cannot change the parent category of a category that has children',
    },

    // Client messages
    'client.not_found': {
      es: 'Cliente con ID {id} no encontrado',
      en: 'Client with ID {id} not found',
    },
    'client.already_exists': {
      es: 'Ya existe un cliente con el código "{code}"',
      en: 'A client with code "{code}" already exists',
    },
    'client.created_successfully': {
      es: 'Cliente creado exitosamente',
      en: 'Client created successfully',
    },
    'client.updated_successfully': {
      es: 'Cliente actualizado exitosamente',
      en: 'Client updated successfully',
    },
    'client.deleted_successfully': {
      es: 'Cliente eliminado exitosamente',
      en: 'Client deleted successfully',
    },

    // General messages
    'general.success': {
      es: 'Operación exitosa',
      en: 'Operation successful',
    },
    'general.error': {
      es: 'Error en la operación',
      en: 'Operation error',
    },
    'general.validation_error': {
      es: 'Error de validación',
      en: 'Validation error',
    },
    'general.server_error': {
      es: 'Error interno del servidor',
      en: 'Internal server error',
    },
    'general.only_images_allowed': {
      es: 'Solo se permiten archivos de imagen',
      en: 'Only image files are allowed',
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
   * @param languageCode - Language code (e.g., 'es', 'en')
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
   * Obtiene la traducción de una clave específica
   * @param key - Clave del mensaje
   * @param languageCode - Código del idioma
   * @returns Mensaje traducido o la clave si no existe
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
   * Reemplaza parámetros en el mensaje
   * @param message - Mensaje con placeholders
   * @param params - Parámetros a reemplazar
   * @returns Mensaje con parámetros reemplazados
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
