import { Expose } from 'class-transformer';
import { ProductResponseDto } from '../product/product-response.dto';

export class InvoiceDetailResponseDto {
  @Expose()
  id: string;

  @Expose()
  quantity: number;

  @Expose()
  price: number;

  @Expose()
  subtotal: number;

  @Expose()
  tax_rate: number;

  @Expose()
  tax_amount: number;

  @Expose()
  total: number;

  @Expose()
  product: ProductResponseDto;

  @Expose()
  created_at: Date;
}
