import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { IStorageService, UploadResult } from './storage.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const pick = (...names: string[]): string | undefined => {
      for (const name of names) {
        const value = this.configService.get<string>(name);
        if (value && value.trim().length > 0) return value;
      }
      return undefined;
    };

    // Railway's "Connect Service to Bucket" injects AWS_* variables, while
    // older setups use S3_*. Prefer AWS_* and fall back to S3_* so both work.
    const endpoint = pick(
      'AWS_ENDPOINT_URL',
      'AWS_ENDPOINT_URL_S3',
      'S3_ENDPOINT',
    );
    const region =
      pick('AWS_REGION', 'AWS_DEFAULT_REGION', 'S3_REGION') || 'auto';
    const accessKeyId =
      pick('AWS_ACCESS_KEY_ID', 'S3_ACCESS_KEY_ID') || '';
    const secretAccessKey =
      pick('AWS_SECRET_ACCESS_KEY', 'S3_SECRET_ACCESS_KEY') || '';
    this.bucket =
      pick('AWS_S3_BUCKET_NAME', 'AWS_BUCKET_NAME', 'S3_BUCKET_NAME') || '';

    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false,
      // Disable the SDK's optional flexible checksums; some S3-compatible
      // providers (Tigris/Railway buckets) reject them.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async upload(
    file: Buffer,
    key: string,
    mimeType: string,
  ): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    );

    this.logger.log(`Archivo subido a S3: ${key}`);
    // Siempre devolvemos el path relativo — el proxy del backend lo sirve
    return { url: `/api/uploads/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Archivo eliminado de S3: ${key}`);
  }

  async getFile(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      return {
        buffer: Buffer.concat(chunks),
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (err: any) {
      if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
        throw new NotFoundException(`Archivo no encontrado: ${key}`);
      }
      throw err;
    }
  }
}
