import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  IStorageService,
  STORAGE_SERVICE,
  UploadResult,
} from './storage/storage.interface';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';
import { UserContextService } from './user-context.service';

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
    private readonly translationService: TranslationService,
    private readonly userContext: UserContextService,
  ) {}

  private async getOrganizationId(): Promise<string> {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      const message = await this.translationService.translate(
        'uploads.org_required',
        this.tenantContext.getUserId() || undefined,
      );
      throw new BadRequestException(message);
    }
    return orgId;
  }

  private async generateKey(
    category: UploadCategory,
    filename: string,
    entityId?: string,
  ): Promise<string> {
    const orgId = await this.getOrganizationId();
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

  private async validateFiles(
    files: Express.Multer.File[],
    options: UploadOptions,
  ): Promise<void> {
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

    const userId = this.tenantContext.getUserId() || undefined;

    if (files.length > maxFiles) {
      const message = await this.translationService.translate(
        'uploads.max_files_exceeded',
        userId,
        { maxFiles },
      );
      throw new BadRequestException(message);
    }

    for (const file of files) {
      if (file.size > maxSize) {
        const message = await this.translationService.translate(
          'uploads.file_too_large',
          userId,
          {
            filename: file.originalname,
            maxSize: Math.round(maxSize / 1024 / 1024),
          },
        );
        throw new BadRequestException(message);
      }

      if (!allowedTypes.includes(file.mimetype)) {
        const message = await this.translationService.translate(
          'uploads.invalid_file_type',
          userId,
          {
            mimetype: file.mimetype,
            allowedTypes: allowedTypes.join(', '),
          },
        );
        throw new BadRequestException(message);
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

    await this.validateFiles(files, options);

    const uploadPromises = files.map(async (file) => {
      const key = await this.generateKey(category, file.originalname, entityId);
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
