import { ClientResponseDto } from '../client/client-response.dto';
import { WithdrawalDetailResponseDto } from '../withdrawal-detail/withdrawal-detail-response.dto';

export class WithdrawalResponseDto {
  id: string;
  code: string;
  destination: string;
  client: ClientResponseDto;
  status: boolean;
  details: WithdrawalDetailResponseDto[];
  created_at: Date;
}
