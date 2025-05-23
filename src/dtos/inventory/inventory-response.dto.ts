import { ProductResponseDto } from '../product/product-response.dto';

export class InventoryResponseDto {
  id: string;
  product: ProductResponseDto;
  quantity: number;
  created_at: Date;
}
