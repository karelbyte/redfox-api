export class CashRegisterBalanceResponseDto {
  current_amount: number;
  total_transactions: number;
  last_transaction_at: Date | null;
}
