import { ProductResponseDto } from '../product/product-response.dto';

export class InventoryListResponseDto {
  id: string;
  product: ProductResponseDto;
  quantity: number;
  price: number;
  createdAt: Date;
} 