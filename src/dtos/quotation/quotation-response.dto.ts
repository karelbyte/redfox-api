import { Client } from '../../models/client.entity';
import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';
import { QuotationStatus } from '../../models/quotation.entity';

export class QuotationResponseDto {
  id: string;
  code: string;
  date: Date;
  valid_until: Date;
  client: Client;
  warehouse: WarehouseResponseDto | null;
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  converted_to_sale_id: string;
  created_at: Date;
}
