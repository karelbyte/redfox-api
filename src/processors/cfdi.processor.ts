import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../models/invoice.entity';
import { CertificationPackFactoryService } from '../services/certification-pack-factory.service';
import { ProductPackSyncService } from '../services/product-pack-sync.service';
import { NotificationService } from '../services/notification.service';
import { CfdiJob } from '../queues/cfdi.queue';
import { In } from 'typeorm';
import { InvoiceDetail } from '../models/invoice-detail.entity';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Injectable()
@Processor('generate-cfdi')
export class CfdiProcessor {
  private readonly logger = new Logger(CfdiProcessor.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceDetail)
    private readonly invoiceDetailRepository: Repository<InvoiceDetail>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly productPackSyncService: ProductPackSyncService,
    private readonly notificationService: NotificationService,
  ) {}

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
    const { invoiceId, userId, options } = job;
    this.logger.log(`[CfdiProcessor] Processing CFDI for invoice: ${invoiceId}`);

    // Recargar la factura con todas sus relaciones necesarias
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

    // Verificar que sigue en estado PENDING_CFDI
    if (invoice.status !== InvoiceStatus.PENDING_CFDI) {
      this.logger.warn(
        `[CfdiProcessor] Invoice ${invoiceId} is no longer in PENDING_CFDI status (current: ${invoice.status}). Skipping.`,
      );
      return;
    }

    try {
      const packService = await this.certificationPackFactory.getPackService();

      // Asegurar que todos los productos estén sincronizados con el PAC
      for (const detail of invoice.details) {
        if (detail.product && !detail.product.product_pack_id) {
          this.logger.log(
            `[CfdiProcessor] Syncing product "${detail.product.name}" with PAC...`,
          );
          const result = await this.productPackSyncService.syncProduct(
            detail.product,
          );
          if (result.packSyncSuccess) {
            detail.product.product_pack_id = result.product.product_pack_id;
          } else {
            throw new Error(
              `No se pudo sincronizar el producto "${detail.product.name}": ${result.packErrorMessage}`,
            );
          }
        }
      }

      // Llamar al PAC para timbrar
      const cfdiResult = await packService.generateCFDI(invoice, options);

      // Actualizar la factura con el resultado del timbrado
      invoice.cfdi_uuid = cfdiResult.uuid;
      invoice.pack_invoice_id = cfdiResult.id;
      invoice.pack_invoice_response = {
        uuid: cfdiResult.uuid,
        status: cfdiResult.status,
        pdf_url: cfdiResult.pdf_url,
        xml_url: cfdiResult.xml_url,
      };
      if (cfdiResult.payload_send) {
        invoice.payload_send = cfdiResult.payload_send;
      }
      invoice.status = InvoiceStatus.SENT;

      await this.invoiceRepository.save(invoice);

      this.logger.log(
        `[CfdiProcessor] ✅ CFDI generated successfully for invoice ${invoiceId}. UUID: ${cfdiResult.uuid}`,
      );

      // Notificar al usuario
      try {
        if (userId) {
          await this.notificationService.createInvoiceNotification(
            `🧾 CFDI generado: ${invoice.code}`,
            `La factura ${invoice.code} fue timbrada exitosamente. UUID: ${cfdiResult.uuid}`,
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

      // Marcar la factura como FAILED_CFDI para que pueda ser reintentada
      invoice.status = InvoiceStatus.FAILED_CFDI;
      invoice.pack_invoice_response = {
        error: error?.message || 'Unknown error',
        failed_at: new Date().toISOString(),
      };
      await this.invoiceRepository.save(invoice);

      // Notificar al usuario del error
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
  }
}
