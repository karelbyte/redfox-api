import { ClientResponseDto } from '../client/client-response.dto';
import { WithdrawalType, WithdrawalStatus, PaymentMethod } from '../../models/withdrawal.entity';

/** Estado fiscal de la venta respecto al PAC: solo nota, facturada directo o en global. */
export type PackFiscalStatus =
  | 'RECEIPT_ONLY'
  | 'INVOICED_DIRECT'
  | 'INVOICED_GLOBAL';

export class WithdrawalResponseDto {
  id: string;
  code: string;
  destination: string;
  client: ClientResponseDto | null;
  amount: number;
  type: WithdrawalType;
  cash_transaction_id?: string;
  status: WithdrawalStatus;
  payment_method: PaymentMethod;
  created_at: Date;
  pack_receipt_id?: string | null;
  /** ID de la factura (directa o global) si esta venta ya está facturada. */
  invoice_id?: string | null;
  /** Estado fiscal en el PAC: solo nota, facturada directo o facturada en global. */
  pack_fiscal_status?: PackFiscalStatus;
  /** Código de la factura (para enlace en front). */
  invoice_code?: string | null;
  /** UUID del CFDI (para verificación SAT). */
  cfdi_uuid?: string | null;
}
