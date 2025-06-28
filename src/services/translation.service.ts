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
