import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal, WithdrawalType } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import {
  packSupports,
  ReceiptData,
  ReceiptItemData,
  ReceiptResponse,
} from '../interfaces/certification-pack.interface';
import { InvoiceStatus } from '../models/invoice.entity';
import { InvoiceService } from './invoice.service';

@Injectable()
export class PosPackSyncService {
  private readonly logger = new Logger(PosPackSyncService.name);

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WithdrawalDetail)
    private readonly withdrawalDetailRepository: Repository<WithdrawalDetail>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Cierra fiscalmente una venta POS con el mecanismo que use el PAC activo.
   *
   * Los PAC mexicanos emiten un recibo, que el cliente puede autofacturar y
   * que al cierre del periodo se agrupa en una factura global. SUNAT no tiene
   * esa figura: toda venta debe emitir boleta o factura en el acto, así que
   * la venta se convierte en factura y se manda a emitir.
   *
   * Nunca lanza: cerrar la venta no puede fallar por el comprobante.
   */
  async emitForWithdrawal(
    withdrawalId: string,
    userId?: string,
  ): Promise<{
    packSyncSuccess: boolean;
    packErrorMessage?: string;
    receipt?: ReceiptResponse;
    invoiceId?: string;
  }> {
    let supportsReceipts = true;

    try {
      const packService = await this.certificationPackFactory.getPackService();
      supportsReceipts = packSupports(packService, 'receipts');
    } catch (error: unknown) {
      const message = this.errorMessage(error);
      this.logger.warn(
        `[PosPackSync] No hay pack de certificación activo: ${message}`,
      );
      return {
        packSyncSuccess: false,
        packErrorMessage: message,
      };
    }

    if (supportsReceipts) {
      const result = await this.createReceiptForWithdrawal(withdrawalId);
      return {
        packSyncSuccess: result.packSyncSuccess,
        packErrorMessage: result.packErrorMessage,
        receipt: result.receipt,
      };
    }

    return this.emitInvoiceForWithdrawal(withdrawalId, userId);
  }

  /**
   * Convierte la venta en factura y la manda a emitir. Idempotente: si la
   * venta ya tiene factura no crea otra, y si esa factura ya fue emitida no
   * la vuelve a mandar.
   */
  private async emitInvoiceForWithdrawal(
    withdrawalId: string,
    userId?: string,
  ): Promise<{
    packSyncSuccess: boolean;
    packErrorMessage?: string;
    invoiceId?: string;
  }> {
    try {
      const existing =
        await this.invoiceService.findByWithdrawalId(withdrawalId);

      const invoice =
        existing ??
        (await this.invoiceService.createFromWithdrawal(withdrawalId, userId));

      if (!invoice) {
        return {
          packSyncSuccess: false,
          packErrorMessage: 'Withdrawal not found',
        };
      }

      const emitted =
        invoice.status !== InvoiceStatus.DRAFT &&
        invoice.status !== InvoiceStatus.FAILED_CFDI;

      if (emitted) {
        this.logger.log(
          `[PosPackSync] La venta ${withdrawalId} ya tiene la factura ${invoice.id} en estado ${invoice.status}`,
        );
        return { packSyncSuccess: true, invoiceId: invoice.id };
      }

      await this.invoiceService.generateCFDI(invoice.id, userId);

      this.logger.log(
        `[PosPackSync] Venta ${withdrawalId} enviada a emitir como factura ${invoice.id}`,
      );

      return { packSyncSuccess: true, invoiceId: invoice.id };
    } catch (error: unknown) {
      const message = this.errorMessage(error);
      this.logger.warn(
        `[PosPackSync] No se pudo emitir el comprobante de la venta ${withdrawalId}: ${message}`,
      );
      return {
        packSyncSuccess: false,
        packErrorMessage: message,
      };
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private buildItems(details: WithdrawalDetail[]): ReceiptItemData[] {
    return details.map((detail) => {
      const product: any = detail.product;
      const mu: any = product?.measurement_unit;

      const unitKey = mu?.code ?? 'H87';
      const unitName = mu?.description ?? 'Elemento';

      // Usamos el SKU/código del producto como product_key aproximado
      const rawCode: string = product?.code ?? product?.sku ?? '';
      const cleaned = rawCode.replace(/[^0-9]/g, '');
      const productKey = cleaned.length > 0 ? cleaned.slice(0, 8) : '01010101';

      return {
        quantity: Number(detail.quantity),
        product: {
          description: product?.description || product?.name || 'Item',
          product_key: productKey,
          price: Number(detail.price),
          tax_included: true,
          taxability: '02',
          taxes: [{ type: 'IVA', rate: 0.16 }],
          unit_key: unitKey,
          unit_name: unitName,
          sku: product?.sku ?? undefined,
        },
      };
    });
  }

  /**
   * Crea un recibo en el PAC para una venta POS (WithdrawalType.POS).
   * Idempotente: usa withdrawal.id como idempotency_key.
   */
  async createReceiptForWithdrawal(withdrawalId: string): Promise<{
    withdrawal: Withdrawal;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
    receipt?: ReceiptResponse;
  }> {
    try {
      const withdrawal = await this.withdrawalRepository.findOne({
        where: { id: withdrawalId },
        relations: [
          'client',
          'details',
          'details.product',
          'details.product.measurement_unit',
          'details.warehouse',
        ],
      });

      if (!withdrawal) {
        return {
          withdrawal: null as any,
          packSyncSuccess: false,
          packErrorMessage: 'Withdrawal not found',
        };
      }

      if (withdrawal.type !== WithdrawalType.POS) {
        return {
          withdrawal,
          packSyncSuccess: false,
          packErrorMessage: 'Withdrawal is not POS type',
        };
      }

      if (withdrawal.pack_receipt_id) {
        // Ya existe recibo asociado; no volvemos a crearlo
        return {
          withdrawal,
          packSyncSuccess: true,
        };
      }

      const details = await this.withdrawalDetailRepository.find({
        where: { withdrawal: { id: withdrawal.id } },
        relations: ['product', 'product.measurement_unit', 'warehouse'],
      });

      if (!details.length) {
        return {
          withdrawal,
          packSyncSuccess: false,
          packErrorMessage: 'Withdrawal has no details to create receipt',
        };
      }

      const items = this.buildItems(details);

      const packService = await this.certificationPackFactory.getPackService();

      const data: ReceiptData = {
        items,
        payment_form: '01', // efectivo por defecto; el mapping detallado se puede afinar después
        currency: 'MXN',
        exchange: 1,
        external_id: withdrawal.code,
        idempotency_key: withdrawal.id,
      };

      // Si hay cliente asociado y éste ya tiene pack_client_id, a futuro podríamos usarlo.
      // Por ahora dejamos customer opcional.

      const receipt = await packService.createReceipt(data);

      withdrawal.pack_receipt_id = receipt.id;
      withdrawal.pack_receipt_response = receipt as unknown as Record<
        string,
        unknown
      >;

      const saved = await this.withdrawalRepository.save(withdrawal);

      return {
        withdrawal: saved,
        packSyncSuccess: true,
        receipt,
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to create POS receipt in certification pack: ${error?.message}`,
      );
      const withdrawal = await this.withdrawalRepository.findOne({
        where: { id: withdrawalId },
      });
      return {
        withdrawal: withdrawal as any,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }

  async cancelReceiptForWithdrawal(withdrawalId: string): Promise<void> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal || !withdrawal.pack_receipt_id) {
      return;
    }

    const packService = await this.certificationPackFactory.getPackService();
    await packService.cancelReceipt(withdrawal.pack_receipt_id);
  }
}
