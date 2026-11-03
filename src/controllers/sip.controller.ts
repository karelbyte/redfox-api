import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../guards/auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { UnifiedUploadService } from '../services/unified-upload.service';
import { TenantContext } from '../services/tenant-context.service';
import {
  IStorageService,
  STORAGE_SERVICE,
} from '../services/storage/storage.interface';

const ZIP_MIME_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'multipart/x-zip',
  'application/octet-stream',
];

const ZIP_MIME_REGEX =
  /^(application\/(x-)?zip(-compressed)?|multipart\/x-zip|application\/octet-stream)$/;

@Controller('sip')
@UseGuards(AuthGuard, AdminGuard)
@UseInterceptors(TenantInterceptor)
export class SipController {
  constructor(
    private readonly unifiedUploadService: UnifiedUploadService,
    private readonly tenantContext: TenantContext,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  @Get('files')
  async listSips() {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('No se pudo determinar la organización');
    }

    const prefix = `${orgId}/marsh/`;
    const files = await this.storageService.list(prefix);

    return files
      .map((file) => {
        const filename = file.key.slice(prefix.length);
        return {
          key: file.key,
          filename,
          // Quita el prefijo de timestamp (Date.now()) usado al almacenar
          displayName: filename.replace(/^\d{10,}-/, ''),
          size: file.size,
          uploadedAt: file.lastModified,
          url: `/api/uploads/${file.key}`,
          downloadUrl: `/api/uploads/${file.key}?download=true`,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );
  }

  @Delete('files/:filename')
  async deleteSip(@Param('filename') filename: string) {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('No se pudo determinar la organización');
    }

    if (
      !filename ||
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('..')
    ) {
      throw new BadRequestException('Nombre de archivo inválido');
    }

    const key = `${orgId}/marsh/${filename}`;
    const files = await this.storageService.list(`${orgId}/marsh/`);

    if (!files.some((file) => file.key === key)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    await this.storageService.delete(key);

    return {
      success: true,
      message: 'SIP eliminado correctamente',
      key,
    };
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('file', 1, { storage: memoryStorage() }),
  )
  async uploadSip(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: ZIP_MIME_REGEX }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibio ningun archivo');
    }

    const file = files[0];

    const isZipSignature =
      file.buffer &&
      file.buffer.length >= 4 &&
      file.buffer[0] === 0x50 &&
      file.buffer[1] === 0x4b;

    if (!isZipSignature) {
      throw new BadRequestException(
        'El archivo no es un ZIP valido (firma PK no encontrada)',
      );
    }

    const uploadResult = await this.unifiedUploadService.uploadFile(
      file,
      'marsh',
      undefined,
      {
        maxSize: 100 * 1024 * 1024,
        allowedTypes: ZIP_MIME_TYPES,
        maxFiles: 1,
      },
    );

    return {
      success: true,
      message: 'SIP subido correctamente',
      url: uploadResult.url,
      key: uploadResult.key,
      filename: file.originalname,
      size: file.size,
    };
  }
}
