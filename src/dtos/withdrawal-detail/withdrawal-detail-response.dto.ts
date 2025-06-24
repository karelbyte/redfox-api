import { ProductResponseDto } from '../product/product-response.dto';
import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';

export class WithdrawalDetailResponseDto {
  id: string;
  product: ProductResponseDto;
  warehouse: WarehouseResponseDto;
  quantity: number;
  price: number;
  created_at: Date;
}
