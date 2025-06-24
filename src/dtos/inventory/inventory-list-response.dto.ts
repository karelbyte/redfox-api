import { ProductResponseDto } from '../product/product-response.dto';
import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';

export class InventoryListResponseDto {
  id: string;
  product: ProductResponseDto;
  warehouse: WarehouseResponseDto;
  quantity: number;
  price: number;
  createdAt: Date;
} 