import { Injectable } from '@nestjs/common';
import { Withdrawal } from '../../models/withdrawal.entity';
import { WithdrawalResponseDto } from '../../dtos/withdrawal/withdrawal-response.dto';
import { ClientMapper } from './client.mapper';

@Injectable()
export class WithdrawalMapper {
  constructor(private readonly clientMapper: ClientMapper) {}

  mapToResponseDto(withdrawal: Withdrawal): WithdrawalResponseDto {
    if (!withdrawal) {
      throw new Error('Withdrawal cannot be null');
    }

    const {
      id,
      code,
      destination,
      client,
      amount,
      type,
      cashTransactionId,
      status,
      created_at,
    } = withdrawal;

    return {
      id,
      code,
      destination,
      client: client ? this.clientMapper.mapToResponseDto(client) : null,
      amount,
      type,
      cash_transaction_id: cashTransactionId,
      status,
      created_at,
    };
  }
}
