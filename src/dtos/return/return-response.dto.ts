import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';
import { ProviderResponseDto } from '../provider/provider-response.dto';
import { ReturnDetailResponseDto } from './return-detail-response.dto';

export class ReturnResponseDto {
  id: string;
  code: string;
  sourceWarehouse: WarehouseResponseDto;
  targetProvider: ProviderResponseDto;
  date: Date;
  description: string;
  status: boolean;
  details: ReturnDetailResponseDto[];
  created_at: Date;
} 