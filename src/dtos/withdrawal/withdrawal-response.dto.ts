import { ClientResponseDto } from '../client/client-response.dto';
import { WithdrawalType } from '../../models/withdrawal.entity';

export class WithdrawalResponseDto {
  id: string;
  code: string;
  destination: string;
  client: ClientResponseDto;
  amount: number;
  type: WithdrawalType;
  cash_transaction_id?: string;
  status: boolean;
  created_at: Date;
}
