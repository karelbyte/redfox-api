import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  IStorageService,
  STORAGE_SERVICE,
  UploadResult,
} from './storage/storage.interface';
import { TenantContext } from './tenant-context.service';

export interface UploadOptions {
  maxSize?: number; // en bytes, default 5MB
  allowedTypes?: string[]; // mimetypes permitidos
  maxFiles?: number; // máximo número de archivos
}

export type UploadCategory = 'products' | 'categories' | 'brands' | 'company';

@Injectable()
export class UnifiedUploadService {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  /**
   * Genera la clave (key) para el storage basada en la organización y categoría
   */
  private generateKey(
    category: UploadCategory,
    filename: string,
    entityId?: string,
  ): string {
    const orgId = this.organizationId;
    const timestamp = Date.now();
    const cleanFilename = this.sanitizeFilename(filename);

    if (entityId) {
      // Para productos, categorías, marcas con ID específico
      return `${orgId}/${category}/${entityId}/${timestamp}-${cleanFilename}`;
    } else {
      // Para archivos de empresa (logo, favicon, etc.)
      return `${orgId}/${category}/${timestamp}-${cleanFilename}`;
    }
  }

  /**
   * Sanitiza el nombre del archivo
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '')
      .toLowerCase();
  }

  /**
   * Valida los archivos según las opciones
   */
  private validateFiles(
    files: Express.Multer.File[],
    options: UploadOptions,
  ): void {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB por defecto
      allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ],
      maxFiles = 10,
    } = options;

    if (files.length > maxFiles) {
      throw new BadRequestException(`Máximo ${maxFiles} archivos permitidos`);
    }

    for (const file of files) {
      if (file.size > maxSize) {
        throw new BadRequestException(
          `El archivo ${file.originalname} excede el tamaño máximo de ${Math.round(maxSize / 1024 / 1024)}MB`,
        );
      }

      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: ${allowedTypes.join(', ')}`,
        );
      }
    }
  }

  /**
   * Sube múltiples archivos para una entidad específica
   */
  async uploadFiles(
    files: Express.Multer.File[],
    category: UploadCategory,
    entityId?: string,
    options: UploadOptions = {},
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      return [];
    }

    this.validateFiles(files, options);

    const uploadPromises = files.map(async (file) => {
      const key = this.generateKey(category, file.originalname, entityId);
      return this.storageService.upload(file.buffer, key, file.mimetype);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Sube un solo archivo
   */
  async uploadFile(
    file: Express.Multer.File,
    category: UploadCategory,
    entityId?: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const results = await this.uploadFiles([file], category, entityId, options);
    return results[0];
  }

  /**
   * Elimina archivos por sus keys
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.storageService.delete(key));
    await Promise.all(deletePromises);
  }

  /**
   * Elimina un archivo por su key
   */
  async deleteFile(key: string): Promise<void> {
    await this.storageService.delete(key);
  }

  /**
   * Extrae la key del storage desde una URL
   * Ejemplo: /api/uploads/org-id/products/product-id/image.jpg -> org-id/products/product-id/image.jpg
   */
  extractKeyFromUrl(url: string): string | null {
    const match = url.match(/\/api\/uploads\/(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Elimina archivos antiguos basándose en URLs
   */
  async deleteFilesByUrls(urls: string[]): Promise<void> {
    const keys = urls
      .map((url) => this.extractKeyFromUrl(url))
      .filter((key) => key !== null);

    if (keys.length > 0) {
      await this.deleteFiles(keys);
    }
  }
}
