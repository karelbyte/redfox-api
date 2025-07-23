import { Provider } from '../../models/provider.entity';
import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';

export class PurchaseOrderResponseDto {
  id: string;
  code: string;
  date: Date;
  provider: Provider;
  warehouse: WarehouseResponseDto;
  document: string;
  amount: number;
  status: string;
  notes?: string;
  expected_delivery_date?: Date;
  created_at: Date;
} 