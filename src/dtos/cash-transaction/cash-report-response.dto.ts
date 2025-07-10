import { CashTransactionResponseDto } from './cash-transaction-response.dto';

export class CashReportResponseDto {
  total_sales: number;
  total_refunds: number;
  total_adjustments: number;
  cash_sales: number;
  card_sales: number;
  opening_balance: number;
  closing_balance: number;
  transactions: CashTransactionResponseDto[];
} 