import { ProductResponseDto } from '../product/product-response.dto';

export class QuotationDetailResponseDto {
  id: string;
  quantity: number;
  price: number;
  discount_percentage: number;
  discount_amount: number;
  subtotal: number;
  product: ProductResponseDto;
  created_at: Date;
}
