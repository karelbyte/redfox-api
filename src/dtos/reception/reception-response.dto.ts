import { ProviderResponseDto } from '../provider/provider-response.dto';
import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';

export class ReceptionResponseDto {
  id: string;
  code: string;
  date: Date;
  provider: ProviderResponseDto;
  warehouse: WarehouseResponseDto;
  document: string;
  amount: number;
  status: boolean;
  created_at: Date;
}
