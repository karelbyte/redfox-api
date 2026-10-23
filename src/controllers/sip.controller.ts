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
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { UnifiedUploadService } from '../services/unified-upload.service';

@Controller('sip')
@UseGuards(AuthGuard, SuperAdminGuard)
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
          new FileTypeValidator({ fileType: /application\/zip/ }),
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

    const uploadResult = await this.unifiedUploadService.uploadFile(
      file,
      'marsh',
      undefined,
      {
        maxSize: 100 * 1024 * 1024,
        allowedTypes: ['application/zip'],
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
