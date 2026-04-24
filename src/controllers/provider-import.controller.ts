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
import { ProviderImportService } from '../services/provider-import.service';
import { ImportLogService } from '../services/import-log.service';
import { ImportLogType } from '../models/import-log.entity';
import { ImportQueue } from '../queues/import.queue';
import { TenantContext } from '../services/tenant-context.service';
import { UserId } from '../decorators/user-id.decorator';
import { TranslationService } from '../services/translation.service';

@Controller('providers/import')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ProviderImportController {
  constructor(
    private readonly importService: ProviderImportService,
    private readonly importLogService: ImportLogService,
    private readonly importQueue: ImportQueue,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
  ) {}

  @Post('csv')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async importCSV(
    @UploadedFile() file: Express.Multer.File,
    @UserId() userId: string,
  ) {
    if (!file) {
      const message = await this.translationService.translate(
        'general.no_file',
        userId,
      );
      throw new BadRequestException(message);
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['csv', 'txt'].includes(ext || '')) {
      const message = await this.translationService.translate(
        'general.invalid_extension_csv',
        userId,
      );
      throw new BadRequestException(message);
    }

    const rows = this.importService.parseCSV(file.buffer);
    if (rows.length === 0) {
      const message = await this.translationService.translate(
        'general.empty_file',
        userId,
      );
      throw new BadRequestException(message);
    }

    const organizationId = this.tenantContext.getOrganizationId();
    if (!organizationId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        userId,
      );
      throw new BadRequestException(message);
    }

    await this.importQueue.addImportJob({
      type: 'provider',
      rows,
      userId,
      organizationId,
    });

    const successMessage = await this.translationService.translate(
      'import.queued_message',
      userId,
      { count: rows.length, type: 'proveedores' },
    );

    return {
      status: 'queued',
      total: rows.length,
      message: successMessage,
    };
  }

  @Get('history')
  async getHistory(@Query('limit') limit?: string, @UserId() userId?: string) {
    const organizationId = this.tenantContext.getOrganizationId();
    if (!organizationId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        userId,
      );
      throw new BadRequestException(message);
    }

    const take = Math.min(parseInt(limit || '10', 10) || 10, 50);
    return this.importLogService.findByOrg(
      organizationId,
      ImportLogType.PROVIDER,
      take,
    );
  }

  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const fields = [
      {
        name: 'code',
        required: true,
        type: 'texto',
        desc: 'Código único del proveedor (3-50 chars). No se puede repetir.',
        example: 'PROV001',
      },
      {
        name: 'name',
        required: true,
        type: 'texto',
        desc: 'Nombre del proveedor o empresa (3-100 chars).',
        example: 'Distribuidora ABC S.A.',
      },
      {
        name: 'description',
        required: false,
        type: 'texto',
        desc: 'Descripción o notas. Si se omite, se usa el nombre.',
        example: 'Proveedor de lácteos',
      },
      {
        name: 'phone',
        required: false,
        type: 'texto',
        desc: 'Teléfono de contacto.',
        example: '+52 555 123 4567',
      },
      {
        name: 'email',
        required: false,
        type: 'email',
        desc: 'Correo electrónico válido.',
        example: 'contacto@abc.com',
      },
      {
        name: 'status',
        required: false,
        type: 'opción',
        desc: 'true = activo | false = inactivo. Default: true',
        example: 'true',
      },
      {
        name: 'tax_document',
        required: false,
        type: 'texto',
        desc: 'RFC del proveedor. Si se proporciona, se crea el registro fiscal.',
        example: 'ABC010101AAA',
      },
      {
        name: 'tax_name',
        required: false,
        type: 'texto',
        desc: 'Razón social. Si se omite, se usa el nombre.',
        example: 'Distribuidora ABC S.A. de C.V.',
      },
      {
        name: 'tax_system',
        required: false,
        type: 'código',
        desc: 'Régimen fiscal SAT. Ej: 616, 601, 612',
        example: '601',
      },
      {
        name: 'invoice_use',
        required: false,
        type: 'código',
        desc: 'Uso CFDI. Ej: G03, G01, S01',
        example: 'G03',
      },
      {
        name: 'address_zip',
        required: false,
        type: 'texto',
        desc: 'Código postal. Si se proporciona, se crea la dirección.',
        example: '85900',
      },
      {
        name: 'address_street',
        required: false,
        type: 'texto',
        desc: 'Calle y número exterior.',
        example: 'Blvd. Industrial 456',
      },
      {
        name: 'address_city',
        required: false,
        type: 'texto',
        desc: 'Ciudad.',
        example: 'Hermosillo',
      },
      {
        name: 'address_state',
        required: false,
        type: 'texto',
        desc: 'Estado o provincia.',
        example: 'Sonora',
      },
      {
        name: 'address_country',
        required: false,
        type: 'código',
        desc: 'País en código ISO 3 letras. Default: MEX',
        example: 'MEX',
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
    const example2 = [
      'PROV002',
      'Servicios Logísticos XYZ',
      'Transporte y logística',
      '+52 555 987 6543',
      'logistica@xyz.com',
      'true',
      'SLX010101BBB',
      'Servicios Logísticos XYZ S.A.',
      '612',
      'G01',
      '06600',
      'Insurgentes Sur 789',
      'CDMX',
      'CDMX',
      'MEX',
    ]
      .map((v) => q(v))
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
      'attachment; filename="template_proveedores.csv"',
    );
    res.send('\uFEFF' + csv);
  }
}
