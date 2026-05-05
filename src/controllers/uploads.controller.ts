import {
  Controller,
  Get,
  Param,
  Res,
  Query,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  IStorageService,
  STORAGE_SERVICE,
} from '../services/storage/storage.interface';
import { Public } from '../decorators/public.decorator';
import { TranslationService } from '../services/translation.service';

@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly translationService: TranslationService,
  ) {}

  @Public()
  @Get(':orgId/products/:productId/:filename')
  async serveProductFile(
    @Param('orgId') orgId: string,
    @Param('productId') productId: string,
    @Param('filename') filename: string,
    @Query('download') download: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/products/${productId}/${filename}`;
    await this.serveFile(key, res, download === 'true', filename);
  }

  @Public()
  @Get(':orgId/categories/:categoryId/:filename')
  async serveCategoryFile(
    @Param('orgId') orgId: string,
    @Param('categoryId') categoryId: string,
    @Param('filename') filename: string,
    @Query('download') download: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/categories/${categoryId}/${filename}`;
    await this.serveFile(key, res, download === 'true', filename);
  }

  @Public()
  @Get(':orgId/brands/:brandId/:filename')
  async serveBrandFile(
    @Param('orgId') orgId: string,
    @Param('brandId') brandId: string,
    @Param('filename') filename: string,
    @Query('download') download: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/brands/${brandId}/${filename}`;
    await this.serveFile(key, res, download === 'true', filename);
  }

  @Public()
  @Get(':orgId/company/:filename')
  async serveCompanyFile(
    @Param('orgId') orgId: string,
    @Param('filename') filename: string,
    @Query('download') download: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/company/${filename}`;
    await this.serveFile(key, res, download === 'true', filename);
  }

  @Public()
  @Get('products/:filename')
  async serveLegacyProductFile(
    @Param('filename') filename: string,
    @Query('download') download: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `products/${filename}`;
    await this.serveFile(key, res, download === 'true', filename);
  }

  @Public()
  @Get('categories/:filename')
  async serveLegacyCategoryFile(
    @Param('filename') filename: string,
    @Query('download') download: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `categories/${filename}`;
    await this.serveFile(key, res, download === 'true', filename);
  }

  @Public()
  @Get('company/:orgId/:filename')
  async serveLegacyCompanyFile(
    @Param('orgId') orgId: string,
    @Param('filename') filename: string,
    @Query('download') download: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `company/${orgId}/${filename}`;
    await this.serveFile(key, res, download === 'true', filename);
  }

  @Public()
  @Get(':orgId/documents/:docId/:filename')
  async serveDocumentFile(
    @Param('orgId') orgId: string,
    @Param('docId') docId: string,
    @Param('filename') filename: string,
    @Query('download') download: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/documents/${docId}/${filename}`;
    await this.serveFile(key, res, download === 'true', filename);
  }

  private async serveFile(
    key: string,
    res: Response,
    download = false,
    filename?: string,
  ): Promise<void> {
    try {
      const { buffer, contentType } = await this.storageService.getFile(key);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Content-Length', buffer.length);

      if (download && filename) {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`,
        );
      }

      res.end(buffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        const message = await this.translationService.translateWithLanguage(
          'general.not_found',
          'en',
        );
        res.status(404).send(message);
      } else {
        const message = await this.translationService.translateWithLanguage(
          'general.server_error',
          'en',
        );
        res.status(500).send(message);
      }
    }
  }
}
