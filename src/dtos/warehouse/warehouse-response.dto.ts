import { CurrencyResponseDto } from '../currency/currency-response.dto';

export class WarehouseResponseDto {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  is_open: boolean;
  status: boolean;
  currency: CurrencyResponseDto;
  created_at: Date;
}
