import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { ProductImportService } from '../services/product-import.service';
import { ImportLogService } from '../services/import-log.service';
import { ImportLogType } from '../models/import-log.entity';
import { ImportQueue } from '../queues/import.queue';
import { TenantContext } from '../services/tenant-context.service';
import { UserId } from '../decorators/user-id.decorator';

@Controller('products/import')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ProductImportController {
  constructor(
    private readonly importService: ProductImportService,
    private readonly importLogService: ImportLogService,
    private readonly importQueue: ImportQueue,
    private readonly tenantContext: TenantContext,
  ) {}

  @Post('csv')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async importCSV(
    @UploadedFile() file: Express.Multer.File,
    @UserId() userId: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['csv', 'txt'].includes(ext || '')) {
      throw new BadRequestException(
        'Solo se aceptan archivos CSV (.csv, .txt)',
      );
    }

    const rows = this.importService.parseCSV(file.buffer);
    if (rows.length === 0)
      throw new BadRequestException('El archivo no contiene filas de datos');

    const organizationId = this.tenantContext.getOrganizationId();
    if (!organizationId)
      throw new BadRequestException('Contexto de organización requerido');

    await this.importQueue.addImportJob({
      type: 'product',
      rows,
      userId,
      organizationId,
    });

    return {
      status: 'queued',
      total: rows.length,
      message: `Importación de ${rows.length} productos en proceso. Recibirás una notificación cuando termine.`,
    };
  }

  @Get('history')
  async getHistory(@Query('limit') limit?: string) {
    const organizationId = this.tenantContext.getOrganizationId();
    if (!organizationId)
      throw new BadRequestException('Contexto de organización requerido');

    const take = Math.min(parseInt(limit || '10', 10) || 10, 50);
    return this.importLogService.findByOrg(
      organizationId,
      ImportLogType.PRODUCT,
      take,
    );
  }

  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const fields = [
      {
        name: 'name',
        required: true,
        type: 'texto',
        desc: 'Nombre del producto',
        example: 'Leche Entera 1L',
      },
      {
        name: 'sku',
        required: true,
        type: 'texto',
        desc: 'Código único interno (no se puede repetir)',
        example: 'LECH-001',
      },
      {
        name: 'code',
        required: true,
        type: 'texto',
        desc: 'Código SAT (mínimo 8 caracteres)',
        example: '50211503',
      },
      {
        name: 'measurement_unit',
        required: true,
        type: 'código',
        desc: 'Código de unidad SAT (H87=Pieza, LTR=Litro, E48=Servicio)',
        example: 'LTR',
      },
      {
        name: 'description',
        required: false,
        type: 'texto',
        desc: 'Descripción del producto',
        example: 'Leche entera pasteurizada 1 litro',
      },
      {
        name: 'base_price',
        required: false,
        type: 'decimal',
        desc: 'Precio base de venta (ej: 25.00)',
        example: '25.00',
      },
      {
        name: 'type',
        required: false,
        type: 'opción',
        desc: 'Tipo: tangible | service | digital',
        example: 'tangible',
      },
      {
        name: 'inventory_strategy',
        required: false,
        type: 'opción',
        desc: 'Estrategia: fifo | fefo | average',
        example: 'average',
      },
      {
        name: 'brand',
        required: false,
        type: 'texto',
        desc: 'Nombre de la marca (debe existir en el sistema)',
        example: 'Lala',
      },
      {
        name: 'category',
        required: false,
        type: 'texto',
        desc: 'Nombre de la categoría (debe existir en el sistema)',
        example: 'Lácteos',
      },
      {
        name: 'barcode',
        required: false,
        type: 'texto',
        desc: 'Código de barras EAN/UPC',
        example: '7501055300018',
      },
      {
        name: 'min_stock',
        required: false,
        type: 'entero',
        desc: 'Stock mínimo para alertas',
        example: '10',
      },
      {
        name: 'weight',
        required: false,
        type: 'decimal',
        desc: 'Peso en kilogramos',
        example: '1.0',
      },
      {
        name: 'width',
        required: false,
        type: 'decimal',
        desc: 'Ancho en metros',
        example: '0.10',
      },
      {
        name: 'height',
        required: false,
        type: 'decimal',
        desc: 'Alto en metros',
        example: '0.25',
      },
      {
        name: 'length',
        required: false,
        type: 'decimal',
        desc: 'Largo en metros',
        example: '0.10',
      },
    ];

    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headerRow = fields.map((f) => q(f.name)).join(',');
    const requiredRow = fields
      .map((f) => q(f.required ? 'REQUERIDO' : 'opcional'))
      .join(',');
    const typeRow = fields.map((f) => q(`Tipo: ${f.type}`)).join(',');
    const descRow = fields.map((f) => q(f.desc)).join(',');
    const example1 = fields.map((f) => q(f.example)).join(',');
    const example2 = fields
      .map((f) => {
        const map: Record<string, string> = {
          name: 'Servicio de Instalación',
          sku: 'SERV-001',
          code: '81111500',
          measurement_unit: 'E48',
          description: 'Servicio técnico de instalación',
          base_price: '500.00',
          type: 'service',
          inventory_strategy: 'average',
          brand: '',
          category: 'Servicios',
          barcode: '',
          min_stock: '0',
          weight: '',
          width: '',
          height: '',
          length: '',
        };
        return q(map[f.name] ?? '');
      })
      .join(',');

    const csv = [
      headerRow,
      requiredRow,
      typeRow,
      descRow,
      example1,
      example2,
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="template_productos.csv"',
    );
    res.send('\uFEFF' + csv);
  }
}
