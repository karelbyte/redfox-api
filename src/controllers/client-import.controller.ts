import {
  Controller, Post, Get, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, Request, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { ClientImportService } from '../services/client-import.service';
import { ImportLogService } from '../services/import-log.service';
import { ImportLogType } from '../models/import-log.entity';
import { ImportQueue } from '../queues/import.queue';
import { TenantContext } from '../services/tenant-context.service';
import { UserId } from '../decorators/user-id.decorator';

@Controller('clients/import')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ClientImportController {
  constructor(
    private readonly importService: ClientImportService,
    private readonly importLogService: ImportLogService,
    private readonly importQueue: ImportQueue,
    private readonly tenantContext: TenantContext,
  ) {}

  @Post('csv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importCSV(
    @UploadedFile() file: Express.Multer.File,
    @UserId() userId: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['csv', 'txt'].includes(ext || '')) {
      throw new BadRequestException('Solo se aceptan archivos CSV (.csv, .txt)');
    }

    // Parsear el CSV de forma síncrona (rápido — solo lectura de texto)
    const rows = this.importService.parseCSV(file.buffer);
    if (rows.length === 0) throw new BadRequestException('El archivo no contiene filas de datos');

    const organizationId = this.tenantContext.getOrganizationId();
    if (!organizationId) throw new BadRequestException('Contexto de organización requerido');

    // Encolar el job — responde inmediatamente
    await this.importQueue.addImportJob({
      type: 'client',
      rows,
      userId,
      organizationId,
    });

    return {
      status: 'queued',
      total: rows.length,
      message: `Importación de ${rows.length} clientes en proceso. Recibirás una notificación cuando termine.`,
    };
  }

  /**
   * GET /api/clients/import/history
   * Devuelve los últimos 10 jobs de importación de clientes para la organización.
   */
  @Get('history')
  async getHistory(@Query('limit') limit?: string) {
    const organizationId = this.tenantContext.getOrganizationId();
    if (!organizationId) throw new BadRequestException('Contexto de organización requerido');

    const take = Math.min(parseInt(limit || '10', 10) || 10, 50);
    return this.importLogService.findByOrg(organizationId, ImportLogType.CLIENT, take);
  }
}
