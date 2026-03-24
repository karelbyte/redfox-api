import {
  Controller,
  Get,
  Param,
  Res,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { IStorageService, STORAGE_SERVICE } from '../services/storage/storage.interface';
import { Public } from '../decorators/public.decorator';

@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  /**
   * Proxy de archivos — sirve cualquier archivo del storage configurado.
   * El frontend siempre llama a /api/uploads/* sin importar si es local o S3.
   * Ruta: GET /api/uploads/company/:orgId/:filename
   */
  @Public()
  @Get('company/:orgId/:filename')
  async serveCompanyFile(
    @Param('orgId') orgId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `company/${orgId}/${filename}`;
    const { buffer, contentType } = await this.storageService.getFile(key);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
