export class CashTransactionResponseDto {
  id: string;
  cash_register_id: string;
  type: string;
  amount: number;
  description: string;
  reference: string;
  payment_method: string;
  sale_id?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
} 