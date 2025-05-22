import { ProductResponseDto } from '../product/product-response.dto';

export class InventoryResponseDto {
  id: string;
  product: ProductResponseDto;
  stock: number;
  created_at: Date;
} 