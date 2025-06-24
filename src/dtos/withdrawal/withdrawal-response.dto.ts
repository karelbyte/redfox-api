import { ClientResponseDto } from '../client/client-response.dto';

export class WithdrawalResponseDto {
  id: string;
  code: string;
  destination: string;
  client: ClientResponseDto;
  amount: number;
  status: boolean;
  created_at: Date;
}
