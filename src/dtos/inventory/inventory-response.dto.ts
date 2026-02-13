import { ProductResponseDto } from '../product/product-response.dto';
import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';

export class InventoryResponseDto {
  id: string;
  warehouse: WarehouseResponseDto;
  product: ProductResponseDto;
  quantity: number;
  price: number;
  pack_product_id?: string | null;
  batch_number?: string;
  expiration_date?: Date;
  entry_id?: string;
  createdAt: Date;
  updatedAt: Date;
}
