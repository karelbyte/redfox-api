import {
  Controller,
  Get,
  Param,
  Res,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  IStorageService,
  STORAGE_SERVICE,
} from '../services/storage/storage.interface';
import { Public } from '../decorators/public.decorator';

@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  @Public()
  @Get(':orgId/products/:productId/:filename')
  async serveProductFile(
    @Param('orgId') orgId: string,
    @Param('productId') productId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/products/${productId}/${filename}`;
    await this.serveFile(key, res);
  }

  @Public()
  @Get(':orgId/categories/:categoryId/:filename')
  async serveCategoryFile(
    @Param('orgId') orgId: string,
    @Param('categoryId') categoryId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/categories/${categoryId}/${filename}`;
    await this.serveFile(key, res);
  }

  @Public()
  @Get(':orgId/brands/:brandId/:filename')
  async serveBrandFile(
    @Param('orgId') orgId: string,
    @Param('brandId') brandId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/brands/${brandId}/${filename}`;
    await this.serveFile(key, res);
  }

  @Public()
  @Get(':orgId/company/:filename')
  async serveCompanyFile(
    @Param('orgId') orgId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${orgId}/company/${filename}`;
    await this.serveFile(key, res);
  }

  // Rutas legacy para compatibilidad con archivos existentes
  @Public()
  @Get('products/:filename')
  async serveLegacyProductFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `products/${filename}`;
    await this.serveFile(key, res);
  }

  @Public()
  @Get('categories/:filename')
  async serveLegacyCategoryFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `categories/${filename}`;
    await this.serveFile(key, res);
  }

  // Ruta legacy para company (mantener compatibilidad)
  @Public()
  @Get('company/:orgId/:filename')
  async serveLegacyCompanyFile(
    @Param('orgId') orgId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `company/${orgId}/${filename}`;
    await this.serveFile(key, res);
  }

  private async serveFile(key: string, res: Response): Promise<void> {
    try {
      const { buffer, contentType } = await this.storageService.getFile(key);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).send('File not found');
      } else {
        res.status(500).send('Internal server error');
      }
    }
  }
}
