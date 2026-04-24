import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
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
import { TranslationService } from '../services/translation.service';

@Controller('clients/import')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ClientImportController {
  constructor(
    private readonly importService: ClientImportService,
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
      type: 'client',
      rows,
      userId,
      organizationId,
    });

    const successMessage = await this.translationService.translate(
      'import.queued_message',
      userId,
      { count: rows.length, type: 'clientes' },
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
      ImportLogType.CLIENT,
      take,
    );
  }
}
