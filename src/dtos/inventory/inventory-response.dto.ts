import { ProductResponseDto } from '../product/product-response.dto';
import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';

export class InventoryResponseDto {
  id: string;
  warehouse: WarehouseResponseDto;
  product: ProductResponseDto;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}
