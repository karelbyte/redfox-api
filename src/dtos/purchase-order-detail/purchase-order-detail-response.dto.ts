import { ProductResponseDto } from '../product/product-response.dto';

export class PurchaseOrderDetailResponseDto {
  id: string;
  quantity: number;
  price: number;
  received_quantity: number;
  product: ProductResponseDto;
  created_at: Date;
} 