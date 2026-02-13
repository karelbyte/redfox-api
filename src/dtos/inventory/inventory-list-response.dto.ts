import { ProductResponseDto } from '../product/product-response.dto';
import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';

export class InventoryListResponseDto {
  id: string;
  product: ProductResponseDto;
  warehouse: WarehouseResponseDto;
  quantity: number;
  price: number;
  pack_product_id?: string | null;
  batch_number?: string;
  expiration_date?: Date;
  createdAt: Date;
}
