import { ReceptionDetailResponseDto } from '../reception-detail/reception-detail-response.dto';
import { ProviderResponseDto } from '../provider/provider-response.dto';

export class ReceptionResponseDto {
  id: string;
  code: string;
  date: Date;
  provider: ProviderResponseDto;
  document: string;
  amount: number;
  status: boolean;
  details: ReceptionDetailResponseDto[];
  created_at: Date;
}
