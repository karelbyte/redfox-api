import { CashTransaction } from '../../models/cash-transaction.entity';
import { CashTransactionResponseDto } from '../../dtos/cash-transaction/cash-transaction-response.dto';

export class CashTransactionMapper {
  static mapToResponseDto(cashTransaction: CashTransaction): CashTransactionResponseDto {
    return {
      id: cashTransaction.id,
      cash_register_id: cashTransaction.cashRegisterId,
      type: cashTransaction.type,
      amount: Number(cashTransaction.amount),
      description: cashTransaction.description,
      reference: cashTransaction.reference,
      payment_method: cashTransaction.paymentMethod,
      sale_id: cashTransaction.saleId,
      created_by: cashTransaction.createdBy,
      created_at: cashTransaction.created_at,
      updated_at: cashTransaction.updated_at,
    };
  }

  static mapToResponseDtoList(cashTransactions: CashTransaction[]): CashTransactionResponseDto[] {
    return cashTransactions.map((cashTransaction) => this.mapToResponseDto(cashTransaction));
  }
} 