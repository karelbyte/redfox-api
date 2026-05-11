import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../models/invoice.entity';
import { CertificationPackFactoryService } from '../services/certification-pack-factory.service';
import { NotificationService } from '../services/notification.service';
import { TenantContext } from '../services/tenant-context.service';
import { CfdiJob } from '../queues/cfdi.queue';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { InvoiceService } from '../services/invoice.service';

@Injectable()
@Processor('generate-cfdi')
export class CfdiProcessor {
  private readonly logger = new Logger(CfdiProcessor.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly notificationService: NotificationService,
    private readonly tenantContext: TenantContext,
  ) {}

  private isValidUUID(uuid: string | null | undefined): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid.trim());
  }

  /**
   * Bull processor para Redis. En-rutador del Job.
   */
  @Process('generate-cfdi')
  async handleTranscode(job: Job<CfdiJob>): Promise<void> {
    await this.process(job.data);
  }

  /**
   * Procesa un job de generación de CFDI.
   * Se invoca desde la cola (in-memory o el método anterior para Bull).
   * Actualiza el status de la factura a SENT o FAILED_CFDI según el resultado.
   */
  async process(job: CfdiJob): Promise<void> {
    const { invoiceId, userId, organizationId, options, emitterId } = job;

    return this.tenantContext.run(
      {
        organizationId,
        tenantSlug: null,
        userId: userId || null,
        ipAddress: null,
      },
      async () => {
        this.logger.log(`[CfdiProcessor] Processing CFDI for invoice: ${invoiceId}`);

        const invoice = await this.invoiceRepository.findOne({
          where: { id: invoiceId },
          relations: [
            'client',
            'client.taxData',
            'details',
            'details.product',
            'details.product.tax',
            'details.product.taxes',
          ],
        });

        if (!invoice) {
          this.logger.error(`[CfdiProcessor] Invoice ${invoiceId} not found`);
          return;
        }

        if (invoice.organization_id !== organizationId) {
          this.logger.error(
            `[CfdiProcessor] Organization mismatch: job=${organizationId}, invoice=${invoice.organization_id}`,
          );
          return;
        }

        this.logger.log(
          `[CfdiProcessor] Tenant context set for organization: ${organizationId}`,
        );

        if (invoice.status !== InvoiceStatus.PENDING_CFDI) {
          this.logger.warn(
            `[CfdiProcessor] Invoice ${invoiceId} is no longer in PENDING_CFDI status (current: ${invoice.status}). Skipping.`,
          );
          return;
        }

        try {
          const packService = await this.certificationPackFactory.getPackService();

          const cfdiResult = await packService.generateCFDI(invoice, options, emitterId);

          await this.invoiceService.updateStatusAfterCertification(invoiceId, {
            success: true,
            uuid: cfdiResult.uuid,
            id: cfdiResult.id,
            status: cfdiResult.status,
            pdf_url: cfdiResult.pdf_url,
            xml_url: cfdiResult.xml_url,
            payload_send: cfdiResult.payload_send,
            emitterId,
          });

          const uuidMessage = cfdiResult.uuid ? cfdiResult.uuid : 'UUID no disponible (revisar con PAC)';
          this.logger.log(
            `[CfdiProcessor] ✅ CFDI generated successfully for invoice ${invoiceId}. UUID: ${uuidMessage}`,
          );

          try {
            if (userId) {
              const notificationMessage = cfdiResult.uuid
                ? `La factura ${invoice.code} fue timbrada exitosamente. UUID: ${cfdiResult.uuid}`
                : `La factura ${invoice.code} fue timbrada exitosamente, pero el UUID no está disponible. Consulte con su PAC para obtener el folio fiscal.`;

              await this.notificationService.createInvoiceNotification(
                `🧾 CFDI generado: ${invoice.code}`,
                notificationMessage,
                invoice.id,
                userId,
              );
            }
          } catch {
            /* no bloquear el flujo por error de notificación */
          }
        } catch (error: any) {
          this.logger.error(
            `[CfdiProcessor] ❌ Failed to generate CFDI for invoice ${invoiceId}: ${error?.message}`,
          );

          await this.invoiceService.updateStatusAfterCertification(invoiceId, {
            success: false,
            error: error?.message,
          });

          try {
            if (userId) {
              await this.notificationService.createInvoiceNotification(
                `❌ Error al timbrar: ${invoice.code}`,
                `La factura ${invoice.code} no pudo ser timbrada. Puedes reintentarlo desde el módulo de facturas.`,
                invoice.id,
                userId,
              );
            }
          } catch {
            /* no bloquear */
          }
        }
      },
    );
  }
}   
