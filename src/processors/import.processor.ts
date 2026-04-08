import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InMemoryImportQueue } from '../queues/in-memory-import.queue';
import { ImportJob } from '../queues/import.queue';
import { ClientImportService } from '../services/client-import.service';
import { ProductImportService } from '../services/product-import.service';
import { ProviderImportService } from '../services/provider-import.service';
import { ImportLogService } from '../services/import-log.service';
import { ImportLogType } from '../models/import-log.entity';
import { Notification } from '../models/notification.entity';

@Processor('import')
@Injectable()
export class ImportProcessor implements OnModuleInit {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    private readonly inMemoryQueue: InMemoryImportQueue,
    private readonly clientImportService: ClientImportService,
    private readonly productImportService: ProductImportService,
    private readonly providerImportService: ProviderImportService,
    private readonly importLogService: ImportLogService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  onModuleInit() {
    this.inMemoryQueue.registerProcessor(this.process.bind(this));
    this.logger.log('✅ ImportProcessor registered');
  }

  /** Consumidor Bull — se activa cuando CACHE_TYPE=redis */
  @Process('process-import')
  async processBullJob(job: Job<ImportJob>): Promise<void> {
    return this.process(job.data);
  }

  async process(job: ImportJob): Promise<void> {
    const { userId, organizationId } = job;
    const logType =
      job.type === 'client'
        ? ImportLogType.CLIENT
        : job.type === 'product'
          ? ImportLogType.PRODUCT
          : ImportLogType.PROVIDER;

    // Crear registro pending en import_logs
    const importLog = await this.importLogService.createPending(
      logType,
      userId,
      organizationId,
      job.rows.length,
    );

    try {
      if (job.type === 'client') {
        this.logger.log(
          `⚙️ Processing client import: ${job.rows.length} rows for org=${organizationId}`,
        );

        const result = await this.clientImportService.importRows(
          job.rows,
          organizationId,
        );

        await this.importLogService.complete(importLog.id, {
          created_count: result.created,
          skipped_count: result.skipped,
          error_count: result.errors.length,
          pack_synced: result.pack_synced,
          pack_failed: result.pack_failed,
          summary: result.summary,
          errors: result.errors,
          pack_warnings: result.pack_warnings,
        });

        const hasIssues = result.errors.length > 0 || result.pack_failed > 0;
        const type = hasIssues ? 'warning' : 'success';
        const priority = hasIssues ? 'high' : 'medium';
        const title = hasIssues
          ? '⚠️ Importación de clientes completada con advertencias'
          : '✅ Importación de clientes completada';

        const lines = [
          `${result.created} clientes creados`,
          result.skipped > 0 ? `${result.skipped} omitidos` : null,
          result.pack_synced > 0
            ? `${result.pack_synced} sincronizados al PAC`
            : null,
          result.pack_failed > 0
            ? `${result.pack_failed} fallaron en el PAC`
            : null,
          result.errors.length > 0 ? `${result.errors.length} errores` : null,
        ].filter(Boolean);

        await this.notify(
          userId,
          organizationId,
          title,
          lines.join(' · '),
          type,
          priority,
        );
        this.logger.log(
          `✅ Client import done for org=${organizationId}: ${lines.join(', ')}`,
        );
      } else if (job.type === 'product') {
        this.logger.log(
          `⚙️ Processing product import: ${job.rows.length} rows for org=${organizationId}`,
        );

        // ProductImportService usa TenantContext — necesitamos pasarle el orgId directamente
        const result = await this.productImportService.importRowsWithOrg(
          job.rows,
          organizationId,
        );

        await this.importLogService.complete(importLog.id, {
          created_count: result.created,
          skipped_count: result.skipped,
          error_count: result.errors.length,
          pack_synced: 0,
          pack_failed: 0,
          summary: result.summary,
          errors: result.errors,
          pack_warnings: result.warnings,
        });

        const hasIssues =
          result.errors.length > 0 || result.warnings.length > 0;
        const type = hasIssues ? 'warning' : 'success';
        const priority = hasIssues ? 'high' : 'medium';
        const title = hasIssues
          ? '⚠️ Importación de productos completada con advertencias'
          : '✅ Importación de productos completada';

        const lines = [
          `${result.created} productos creados`,
          result.skipped > 0 ? `${result.skipped} omitidos` : null,
          result.warnings.length > 0
            ? `${result.warnings.length} advertencias`
            : null,
          result.errors.length > 0 ? `${result.errors.length} errores` : null,
        ].filter(Boolean);

        await this.notify(
          userId,
          organizationId,
          title,
          lines.join(' · '),
          type,
          priority,
        );
        this.logger.log(
          `✅ Product import done for org=${organizationId}: ${lines.join(', ')}`,
        );
      } else if (job.type === 'provider') {
        this.logger.log(
          `⚙️ Processing provider import: ${job.rows.length} rows for org=${organizationId}`,
        );

        const result = await this.providerImportService.importRows(
          job.rows,
          organizationId,
        );

        await this.importLogService.complete(importLog.id, {
          created_count: result.created,
          skipped_count: result.skipped,
          error_count: result.errors.length,
          pack_synced: 0,
          pack_failed: 0,
          summary: result.summary,
          errors: result.errors,
          pack_warnings: [],
        });

        const hasIssues = result.errors.length > 0;
        const type = hasIssues ? 'warning' : 'success';
        const priority = hasIssues ? 'high' : 'medium';
        const title = hasIssues
          ? '⚠️ Importación de proveedores completada con advertencias'
          : '✅ Importación de proveedores completada';

        const lines = [
          `${result.created} proveedores creados`,
          result.skipped > 0 ? `${result.skipped} omitidos` : null,
          result.errors.length > 0 ? `${result.errors.length} errores` : null,
        ].filter(Boolean);

        await this.notify(
          userId,
          organizationId,
          title,
          lines.join(' · '),
          type,
          priority,
        );
        this.logger.log(
          `✅ Provider import done for org=${organizationId}: ${lines.join(', ')}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `❌ Import job failed for org=${organizationId}: ${error?.message}`,
        error?.stack,
      );

      await this.importLogService.fail(
        importLog.id,
        `La importación falló inesperadamente: ${error?.message || 'Error desconocido'}`,
      );

      await this.notify(
        userId,
        organizationId,
        '❌ Error en la importación',
        `La importación falló inesperadamente: ${error?.message || 'Error desconocido'}. Intenta de nuevo.`,
        'error',
        'urgent',
      );
    }
  }

  private async notify(
    userId: string,
    organizationId: string,
    title: string,
    message: string,
    type: string,
    priority: string,
  ): Promise<void> {
    try {
      const notification = this.notificationRepo.create({
        userId,
        organization_id: organizationId,
        title,
        message,
        type: type as any,
        priority: priority as any,
        isRead: false,
      });
      await this.notificationRepo.save(notification);
      this.logger.log(`🔔 Notification sent to user=${userId}`);
    } catch (err: any) {
      this.logger.error(`Failed to create notification: ${err?.message}`);
    }
  }
}
