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
   * Gets the language code for a specific user
   * @param userId - User ID
   * @returns Language code (e.g., 'es', 'en')
   */
  async getUserLanguageCode(userId: string): Promise<string> {
    try {
      // Look for the user's specific language
      const userLanguage = await this.languageRepository.findOne({
        where: { userId },
      });

      if (userLanguage) {
        return userLanguage.code;
      }

      // If the user doesn't have a specific language, look for the default language
      const defaultLanguage = await this.languageRepository.findOne({
        where: { userId: IsNull() },
      });

      // If there's no default language, use English
      return defaultLanguage ? defaultLanguage.code : 'en';
    } catch (error) {
      console.error('Error getting user language code:', error);
      return 'en';
    }
  }

  /**
   * Gets the language entity for a specific user
   * @param userId - User ID
   * @returns Language entity or null
   */
  async getUserLanguage(userId: string): Promise<Language | null> {
    try {
      // Look for the user's specific language
      const userLanguage = await this.languageRepository.findOne({
        where: { userId },
      });

      if (userLanguage) {
        return userLanguage;
      }

      // If the user doesn't have a specific language, look for the default language
      const defaultLanguage = await this.languageRepository.findOne({
        where: { userId: IsNull() },
      });

      return defaultLanguage;
    } catch (error) {
      console.error('Error getting user language:', error);
      return null;
    }
  }

  /**
   * Sets the language for a specific user
   * @param userId - User ID
   * @param languageCode - Language code (e.g., 'es', 'en')
   * @returns Updated language entity
   */
  async setUserLanguage(
    userId: string,
    languageCode: string,
  ): Promise<Language> {
    try {
      // Look for the base language by code
      const baseLanguage = await this.languageRepository.findOne({
        where: { code: languageCode, userId: IsNull() },
      });

      if (!baseLanguage) {
        throw new Error(`Language with code ${languageCode} not found`);
      }

      // Look for if there's already a specific language for this user
      const userLanguage = await this.languageRepository.findOne({
        where: { userId },
      });

      if (userLanguage) {
        // Update existing user language
        userLanguage.code = languageCode;
        return await this.languageRepository.save(userLanguage);
      } else {
        // Create new user language
        const newUserLanguage = this.languageRepository.create({
          userId,
          code: languageCode,
        });
        return await this.languageRepository.save(newUserLanguage);
      }
    } catch (error) {
      console.error('Error setting user language:', error);
      throw error;
    }
  }

  /**
   * Removes the specific language for a user (they will use the default language)
   * @param userId - User ID
   * @returns Success message
   */
  async removeUserLanguage(userId: string): Promise<string> {
    try {
      // Look for the user's specific language
      const userLanguage = await this.languageRepository.findOne({
        where: { userId },
      });

      if (userLanguage) {
        // Remove the user's specific language
        await this.languageRepository.remove(userLanguage);
        return 'User language removed successfully';
      }

      return 'User language not found';
    } catch (error) {
      console.error('Error removing user language:', error);
      throw error;
    }
  }
}
