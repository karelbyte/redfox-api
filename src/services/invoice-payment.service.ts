import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../models/invoice.entity';
import { InvoicePayment, InvoicePaymentStatus } from '../models/invoice-payment.entity';
import { AccountReceivable } from '../models/account-receivable.entity';
import { PaymentMethod as ARPaymentMethod } from '../models/account-receivable-payment.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { AccountReceivableService } from './account-receivable.service';
import { TenantContext } from './tenant-context.service';

export interface CreateInvoicePaymentDto {
  amount: number;
  payment_date: string;
  payment_form: string; // Clave SAT: 01, 03, 04...
  notes?: string;
}

export interface InvoicePaymentResponseDto {
  id: string;
  invoice_id: string;
  payment_number: number;
  amount: number;
  payment_date: Date;
  payment_form: string;
  balance_before: number;
  balance_after: number;
  status: InvoicePaymentStatus;
  pack_complement_id: string | null;
  cfdi_complement_uuid: string | null;
  notes: string | null;
  created_at: Date;
}

@Injectable()
export class InvoicePaymentService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoicePayment)
    private readonly invoicePaymentRepository: Repository<InvoicePayment>,
    @InjectRepository(AccountReceivable)
    private readonly accountReceivableRepository: Repository<AccountReceivable>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly accountReceivableService: AccountReceivableService,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  private mapToDto(payment: InvoicePayment): InvoicePaymentResponseDto {
    return {
      id: payment.id,
      invoice_id: payment.invoice_id,
      payment_number: payment.payment_number,
      amount: Number(payment.amount),
      payment_date: payment.payment_date,
      payment_form: payment.payment_form,
      balance_before: Number(payment.balance_before),
      balance_after: Number(payment.balance_after),
      status: payment.status,
      pack_complement_id: payment.pack_complement_id ?? null,
      cfdi_complement_uuid: payment.cfdi_complement_uuid ?? null,
      notes: payment.notes ?? null,
      created_at: payment.created_at,
    };
  }

  async getPayments(invoiceId: string): Promise<InvoicePaymentResponseDto[]> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payments = await this.invoicePaymentRepository.find({
      where: { invoice_id: invoiceId, organization_id: this.organizationId },
      order: { payment_number: 'ASC' },
    });

    return payments.map((p) => this.mapToDto(p));
  }

  async registerPayment(
    invoiceId: string,
    dto: CreateInvoicePaymentDto,
  ): Promise<InvoicePaymentResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot register payment on a cancelled invoice');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    // Solo facturas PPD (crédito) timbradas pueden tener complementos
    if (!invoice.cfdi_uuid) {
      throw new BadRequestException('Invoice must be stamped (have a CFDI UUID) before registering payments');
    }

    // Calcular saldo insoluto actual
    const existingPayments = await this.invoicePaymentRepository.find({
      where: { invoice_id: invoiceId, organization_id: this.organizationId },
      order: { payment_number: 'ASC' },
    });

    const totalPaid = existingPayments
      .filter((p) => p.status !== InvoicePaymentStatus.CANCELLED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const balanceBefore = Math.round((Number(invoice.total_amount) - totalPaid) * 100) / 100;

    if (balanceBefore <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    if (dto.amount > balanceBefore) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${balanceBefore})`,
      );
    }

    const balanceAfter = Math.round((balanceBefore - dto.amount) * 100) / 100;
    const paymentNumber = existingPayments.filter((p) => p.status !== InvoicePaymentStatus.CANCELLED).length + 1;

    // Crear el registro del pago
    const payment = this.invoicePaymentRepository.create({
      invoice_id: invoiceId,
      organization_id: this.organizationId,
      payment_number: paymentNumber,
      amount: dto.amount,
      payment_date: new Date(dto.payment_date) as any,
      payment_form: dto.payment_form,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      status: InvoicePaymentStatus.PENDING,
      notes: dto.notes,
    });

    const savedPayment = await this.invoicePaymentRepository.save(payment);

    // Intentar timbrar el complemento en el PAC
    try {
      const packService = await this.certificationPackFactory.getPackService();

      if (!packService.generatePaymentComplement) {
        throw new BadRequestException('Active PAC does not support payment complements');
      }

      const complementResult = await packService.generatePaymentComplement({
        cfdi_uuid: invoice.cfdi_uuid,
        payment_number: paymentNumber,
        payment_date: dto.payment_date,
        amount: dto.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        payment_form: dto.payment_form,
      });

      savedPayment.status = InvoicePaymentStatus.STAMPED;
      savedPayment.pack_complement_id = complementResult.id;
      savedPayment.cfdi_complement_uuid = complementResult.complement_uuid;
      savedPayment.pack_complement_response = {
        id: complementResult.id,
        complement_uuid: complementResult.complement_uuid,
        invoice_uuid: complementResult.invoice_uuid,
        pdf_url: complementResult.pdf_url,
        xml_url: complementResult.xml_url,
      };

      await this.invoicePaymentRepository.save(savedPayment);

      // Registrar el pago en la cuenta por cobrar asociada a esta factura
      const accountReceivable = await this.accountReceivableRepository.findOne({
        where: { invoiceId: invoiceId, organization_id: this.organizationId },
      });

      if (accountReceivable) {
        // Mapear clave SAT de forma de pago al enum de cuentas por cobrar
        const paymentMethodMap: Record<string, ARPaymentMethod> = {
          '01': ARPaymentMethod.CASH,
          '02': ARPaymentMethod.CHECK,
          '03': ARPaymentMethod.BANK_TRANSFER,
          '04': ARPaymentMethod.CREDIT_CARD,
          '28': ARPaymentMethod.DEBIT_CARD,
          '29': ARPaymentMethod.DEBIT_CARD,
        };
        const arPaymentMethod = paymentMethodMap[dto.payment_form] || ARPaymentMethod.OTHER;

        await this.accountReceivableService.addPayment(
          {
            accountReceivableId: accountReceivable.id,
            amount: dto.amount,
            paymentDate: dto.payment_date,
            paymentMethod: arPaymentMethod,
            reference: savedPayment.cfdi_complement_uuid || savedPayment.id,
            notes: dto.notes || `Complemento de pago #${paymentNumber}`,
          },
          this.organizationId,
        );
      }

      // Si el saldo quedó en 0, marcar la factura como pagada
      if (balanceAfter === 0) {
        invoice.status = InvoiceStatus.PAID;
        await this.invoiceRepository.save(invoice);
      }
    } catch (error: any) {
      // El pago queda en PENDING — el usuario puede reintentar el timbrado
      console.error('Error stamping payment complement:', error);
      throw new BadRequestException(
        `Payment registered but complement stamping failed: ${error.message}`,
      );
    }

    return this.mapToDto(savedPayment);
  }

  async cancelPayment(invoiceId: string, paymentId: string, reason?: string): Promise<void> {
    const payment = await this.invoicePaymentRepository.findOne({
      where: { id: paymentId, invoice_id: invoiceId, organization_id: this.organizationId },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status === InvoicePaymentStatus.CANCELLED) {
      throw new BadRequestException('El complemento de pago ya está cancelado');
    }

    // Si está timbrado, cancelar en el PAC con el motivo proporcionado
    if (payment.status === InvoicePaymentStatus.STAMPED && payment.cfdi_complement_uuid) {
      const packService = await this.certificationPackFactory.getPackService();
      if (packService.cancelPaymentComplement) {
        await packService.cancelPaymentComplement(
          payment.cfdi_complement_uuid,
          reason || '01', // 01 = Comprobante emitido con errores con relación
        );
      }
    }

    payment.status = InvoicePaymentStatus.CANCELLED;
    await this.invoicePaymentRepository.save(payment);

    // Revertir status de la factura si estaba PAID
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });
    if (invoice?.status === InvoiceStatus.PAID) {
      invoice.status = InvoiceStatus.SENT;
      await this.invoiceRepository.save(invoice);
    }
  }
}
