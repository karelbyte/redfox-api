import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  IStorageService,
  STORAGE_SERVICE,
  UploadResult,
} from './storage/storage.interface';
import { TenantContext } from './tenant-context.service';

export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
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

  private generateKey(
    category: UploadCategory,
    filename: string,
    entityId?: string,
  ): string {
    const orgId = this.organizationId;
    const timestamp = Date.now();
    const cleanFilename = this.sanitizeFilename(filename);

    if (entityId) {
      return `${orgId}/${category}/${entityId}/${timestamp}-${cleanFilename}`;
    } else {
      return `${orgId}/${category}/${timestamp}-${cleanFilename}`;
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '')
      .toLowerCase();
  }

  private validateFiles(
    files: Express.Multer.File[],
    options: UploadOptions,
  ): void {
    const {
      maxSize = 5 * 1024 * 1024,
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

  async uploadFile(
    file: Express.Multer.File,
    category: UploadCategory,
    entityId?: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const results = await this.uploadFiles([file], category, entityId, options);
    return results[0];
  }

  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.storageService.delete(key));
    await Promise.all(deletePromises);
  }

  async deleteFile(key: string): Promise<void> {
    await this.storageService.delete(key);
  }

  extractKeyFromUrl(url: string): string | null {
    const match = url.match(/\/api\/uploads\/(.+)$/);
    return match ? match[1] : null;
  }

  async deleteFilesByUrls(urls: string[]): Promise<void> {
    const keys = urls
      .map((url) => this.extractKeyFromUrl(url))
      .filter((key) => key !== null);

    if (keys.length > 0) {
      await this.deleteFiles(keys);
    }
  }
}
