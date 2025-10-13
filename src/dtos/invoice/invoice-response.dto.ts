import { Expose } from 'class-transformer';
import { ClientResponseDto } from '../client/client-response.dto';
import { WithdrawalResponseDto } from '../withdrawal/withdrawal-response.dto';
import { InvoiceDetailResponseDto } from '../invoice-detail/invoice-detail-response.dto';
import { InvoiceStatus, PaymentMethod } from '../../models/invoice.entity';

export class InvoiceResponseDto {
  @Expose()
  id: string;

  @Expose()
  code: string;

  @Expose()
  date: Date;

  @Expose()
  client: ClientResponseDto;

  @Expose()
  withdrawal?: WithdrawalResponseDto | null;

  @Expose()
  subtotal: number;

  @Expose()
  tax_amount: number;

  @Expose()
  total_amount: number;

  @Expose()
  status: InvoiceStatus;

  @Expose()
  cfdi_uuid?: string | null;

  @Expose()
  facturapi_id?: string | null;

  @Expose()
  payment_method: PaymentMethod;

  @Expose()
  payment_conditions?: string | null;

  @Expose()
  notes?: string | null;

  @Expose()
  details?: InvoiceDetailResponseDto[];

  @Expose()
  created_at: Date;
}
