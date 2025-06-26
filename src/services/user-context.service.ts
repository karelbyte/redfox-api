import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Language } from '../models/language.entity';

@Injectable()
export class UserContextService {
  constructor(
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
  ) {}

  /**
   * Obtiene el código de idioma del usuario desde la tabla languages
   * @param userId - ID del usuario autenticado
   * @returns Código del idioma o 'en' por defecto
   */
  async getUserLanguageCode(userId: string): Promise<string> {
    try {
      // Buscar el idioma específico del usuario
      const userLanguage = await this.languageRepository.findOne({
        where: { userId, isActive: true },
      });

      if (userLanguage) {
        return userLanguage.code;
      }

      // Si el usuario no tiene idioma específico, buscar el idioma por defecto
      const defaultLanguage = await this.languageRepository.findOne({
        where: { isDefault: true, isActive: true, userId: IsNull() },
      });

      if (defaultLanguage) {
        return defaultLanguage.code;
      }

      // Si no hay idioma por defecto, usar inglés
      return 'en';
    } catch (error) {
      console.error('Error obteniendo idioma del usuario:', error);
      return 'en';
    }
  }

  /**
   * Obtiene el idioma completo del usuario
   * @param userId - ID del usuario autenticado
   * @returns Objeto Language o null
   */
  async getUserLanguage(userId: string): Promise<Language | null> {
    try {
      // Buscar el idioma específico del usuario
      const userLanguage = await this.languageRepository.findOne({
        where: { userId, isActive: true },
      });

      if (userLanguage) {
        return userLanguage;
      }

      // Si el usuario no tiene idioma específico, buscar el idioma por defecto
      const defaultLanguage = await this.languageRepository.findOne({
        where: { isDefault: true, isActive: true, userId: IsNull() },
      });

      return defaultLanguage;
    } catch (error) {
      console.error('Error obteniendo idioma del usuario:', error);
      return null;
    }
  }

  /**
   * Establece el idioma preferido para un usuario
   * @param userId - ID del usuario
   * @param languageCode - Código del idioma
   * @returns true si se estableció correctamente
   */
  async setUserLanguage(
    userId: string,
    languageCode: string,
  ): Promise<boolean> {
    try {
      // Buscar el idioma base por código
      const baseLanguage = await this.languageRepository.findOne({
        where: { code: languageCode, isActive: true, userId: IsNull() },
      });

      if (!baseLanguage) {
        return false;
      }

      // Buscar si ya existe un idioma específico para este usuario
      const existingUserLanguage = await this.languageRepository.findOne({
        where: { userId, isActive: true },
      });

      if (existingUserLanguage) {
        // Actualizar el idioma existente del usuario
        await this.languageRepository.update(
          { id: existingUserLanguage.id },
          {
            code: baseLanguage.code,
            name: baseLanguage.name,
            nativeName: baseLanguage.nativeName,
            isDefault: false,
            isActive: true,
          },
        );
      } else {
        // Crear una nueva entrada para el usuario con este idioma
        const userLanguage = this.languageRepository.create({
          code: baseLanguage.code,
          name: baseLanguage.name,
          nativeName: baseLanguage.nativeName,
          isDefault: false,
          isActive: true,
          userId: userId,
        });

        await this.languageRepository.save(userLanguage);
      }

      return true;
    } catch (error) {
      console.error('Error estableciendo idioma del usuario:', error);
      return false;
    }
  }

  /**
   * Elimina el idioma específico del usuario (vuelve al idioma por defecto)
   * @param userId - ID del usuario
   * @returns true si se eliminó correctamente
   */
  async removeUserLanguage(userId: string): Promise<boolean> {
    try {
      // Buscar el idioma específico del usuario
      const userLanguage = await this.languageRepository.findOne({
        where: { userId, isActive: true },
      });

      if (userLanguage) {
        // Eliminar el idioma específico del usuario
        await this.languageRepository.remove(userLanguage);
      }

      return true;
    } catch (error) {
      console.error('Error eliminando idioma del usuario:', error);
      return false;
    }
  }
}
