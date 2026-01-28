import { Injectable } from '@nestjs/common';
import { Invoice } from '../../models/invoice.entity';
import { InvoiceResponseDto } from '../../dtos/invoice/invoice-response.dto';
import { ClientMapper } from './client.mapper';
import { WithdrawalMapper } from './withdrawal.mapper';
import { InvoiceDetailMapper } from './invoice-detail.mapper';

@Injectable()
export class InvoiceMapper {
  constructor(
    private readonly clientMapper: ClientMapper,
    private readonly withdrawalMapper: WithdrawalMapper,
    private readonly invoiceDetailMapper: InvoiceDetailMapper,
  ) {}

  mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    if (!invoice) {
      throw new Error('Invoice cannot be null');
    }

    const {
      id,
      code,
      date,
      client,
      withdrawal,
      subtotal,
      tax_amount,
      total_amount,
      status,
      cfdi_uuid,
      pack_invoice_id,
      pack_invoice_response,
      payment_method,
      payment_conditions,
      notes,
      details,
      created_at,
    } = invoice;

    return {
      id,
      code,
      date,
      client: this.clientMapper.mapToResponseDto(client),
      withdrawal: withdrawal ? this.withdrawalMapper.mapToResponseDto(withdrawal) : null,
      subtotal,
      tax_amount,
      total_amount,
      status,
      cfdi_uuid,
      pack_invoice_id: pack_invoice_id ?? null,
      pack_invoice_response: pack_invoice_response ?? null,
      payment_method,
      payment_conditions,
      notes,
      details: details?.map((detail) => this.invoiceDetailMapper.mapToResponseDto(detail)),
      created_at,
    };
  }
}
