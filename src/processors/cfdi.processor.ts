import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../models/invoice.entity';
import { CertificationPackFactoryService } from '../services/certification-pack-factory.service';
import { packSupports } from '../interfaces/certification-pack.interface';
import { ProductPackSyncService } from '../services/product-pack-sync.service';
import { NotificationService } from '../services/notification.service';
import { TenantContext } from '../services/tenant-context.service';
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
    private readonly tenantContext: TenantContext,
  ) {}

  private isValidUUID(uuid: string | null | undefined): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid.trim());
  }

  /**
   * Los packs devuelven en `status` el estado propio del proveedor
   * ('valid', etc.), que se sigue traduciendo a SENT. Solo se respeta el
   * valor cuando el pack devuelve uno de nuestros estados: SUNAT puede
   * responder PENDIENTE, y marcar esa factura como emitida sería incorrecto.
   */
  private resolveInvoiceStatus(packStatus?: string): InvoiceStatus {
    const supported: string[] = [
      InvoiceStatus.SENT,
      InvoiceStatus.PENDING_CFDI,
      InvoiceStatus.FAILED_CFDI,
    ];

    return supported.includes(packStatus as InvoiceStatus)
      ? (packStatus as InvoiceStatus)
      : InvoiceStatus.SENT;
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
        this.logger.log(
          `[CfdiProcessor] Processing CFDI for invoice: ${invoiceId}`,
        );

        // Recargar la factura con todas sus relaciones necesarias
        // const invoice = await this.invoiceRepository.findOne({
        //   where: { id: invoiceId },
        //   relations: [
        //     'client',
        //     'client.addresses',
        //     'client.taxData',
        //     'details',
        //     'details.product',
        //     'details.product.tax',
        //     'details.product.taxes',
        //   ],
        // });

        const invoice = await this.invoiceRepository
          .createQueryBuilder('invoice')
          // Replicamos las relaciones que ya tenías
          .leftJoinAndSelect('invoice.client', 'client')
          .leftJoinAndSelect('client.addresses', 'addresses')
          .leftJoinAndSelect('client.taxData', 'taxData')
          .leftJoinAndSelect('invoice.details', 'details')
          .leftJoinAndSelect('details.product', 'product')
          .leftJoinAndSelect('product.tax', 'tax')
          .leftJoinAndSelect('product.taxes', 'taxes')
          // Necesaria para traducir la unidad de medida al catálogo del PAC.
          .leftJoinAndSelect('product.measurement_unit', 'measurementUnit')
          // Filtramos por el ID de la factura
          .where('invoice.id = :invoiceId', { invoiceId })
          .getOne();

        if (!invoice) {
          this.logger.error(`[CfdiProcessor] Invoice ${invoiceId} not found`);
          return;
        }

        // Verificar que la organización coincida (seguridad adicional)
        if (invoice.organization_id !== organizationId) {
          this.logger.error(
            `[CfdiProcessor] Organization mismatch: job=${organizationId}, invoice=${invoice.organization_id}`,
          );
          return;
        }

        this.logger.log(
          `[CfdiProcessor] Tenant context set for organization: ${organizationId}`,
        );

        // Verificar que sigue en estado PENDING_CFDI
        if (invoice.status !== InvoiceStatus.PENDING_CFDI) {
          this.logger.warn(
            `[CfdiProcessor] Invoice ${invoiceId} is no longer in PENDING_CFDI status (current: ${invoice.status}). Skipping.`,
          );
          return;
        }

        try {
          const packService =
            await this.certificationPackFactory.getPackService();

          // Asegurar que todos los productos estén sincronizados con el PAC.
          // Los packs sin catálogo de productos (SUNAT) no lo necesitan: los
          // datos del producto viajan dentro del propio comprobante.
          if (packSupports(packService, 'productCatalog')) {
            for (const detail of invoice.details) {
              if (detail.product && !detail.product.product_pack_id) {
                this.logger.log(
                  `[CfdiProcessor] Syncing product "${detail.product.name}" with PAC...`,
                );
                const result = await this.productPackSyncService.syncProduct(
                  detail.product,
                );
                if (result.packSyncSuccess) {
                  detail.product.product_pack_id =
                    result.product.product_pack_id;
                } else {
                  throw new Error(
                    `No se pudo sincronizar el producto "${detail.product.name}": ${result.packErrorMessage}`,
                  );
                }
              }
            }
          }

          // Llamar al PAC para timbrar
          const cfdiResult = await packService.generateCFDI(
            invoice,
            options,
            emitterId,
          );

          // Actualizar la factura con el resultado del timbrado
          invoice.cfdi_uuid = this.isValidUUID(cfdiResult.uuid)
            ? cfdiResult.uuid
            : null;
          invoice.pack_invoice_id = cfdiResult.id;
          invoice.pack_invoice_response = {
            uuid: cfdiResult.uuid,
            status: cfdiResult.status,
            pdf_url: cfdiResult.pdf_url,
            xml_url: cfdiResult.xml_url,
            uuid_available: this.isValidUUID(cfdiResult.uuid),
            ...(cfdiResult.raw ?? {}),
          };
          if (cfdiResult.payload_send) {
            invoice.payload_send = cfdiResult.payload_send;
          }
          invoice.emitter_id = emitterId || null;
          invoice.status = this.resolveInvoiceStatus(cfdiResult.status);

          await this.invoiceRepository.save(invoice);

          const uuidMessage = cfdiResult.uuid
            ? cfdiResult.uuid
            : 'UUID no disponible (revisar con PAC)';
          this.logger.log(
            `[CfdiProcessor] ✅ CFDI generated successfully for invoice ${invoiceId}. UUID: ${uuidMessage}`,
          );

          // Notificar al usuario
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
      },
    );
  }
}
