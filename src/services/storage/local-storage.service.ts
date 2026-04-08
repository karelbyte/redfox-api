import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import { IStorageService, UploadResult } from './storage.interface';

const MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
};

const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || 'application/octet-stream';
};

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadsDir: string;

  constructor() {
    this.uploadsDir = join(process.cwd(), 'uploads');
  }

  async upload(
    file: Buffer,
    key: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const fullPath = join(this.uploadsDir, key);
    const dir = fullPath.substring(
      0,
      Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\')),
    );

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file);
    this.logger.log(`Archivo guardado localmente: ${key}`);

    return { url: `/api/uploads/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    const fullPath = join(this.uploadsDir, key);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`Archivo eliminado localmente: ${key}`);
    }
  }

  async getFile(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const fullPath = join(this.uploadsDir, key);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Archivo no encontrado: ${key}`);
    }
    const buffer = fs.readFileSync(fullPath);
    const contentType = getMimeType(fullPath);
    return { buffer, contentType };
  }
}
