export interface UploadResult {
  url: string; // Path relativo para guardar en DB: /api/uploads/company/org-id/logo.png
  key: string; // Identificador del archivo en el storage (ej: company/org-id/logo.png)
}

export interface StoredFile {
  key: string; // Identificador del archivo en el storage (ej: org-id/marsh/1234-sip.zip)
  size: number; // Tamaño en bytes
  lastModified: Date; // Fecha de última modificación
}

export interface IStorageService {
  upload(file: Buffer, key: string, mimeType: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  /**
   * Retorna el archivo como Buffer para servirlo como proxy.
   * @returns { buffer, contentType }
   */
  getFile(key: string): Promise<{ buffer: Buffer; contentType: string }>;
  /**
   * Lista los archivos que comienzan con el prefijo indicado.
   */
  list(prefix: string): Promise<StoredFile[]>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
