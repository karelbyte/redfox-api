import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../guards/auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { UnifiedUploadService } from '../services/unified-upload.service';

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
  ) {}

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
