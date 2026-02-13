import { ProductResponseDto } from '../product/product-response.dto';

export class ReceptionDetailResponseDto {
  id: string;
  product: ProductResponseDto;
  quantity: number;
  price: number;
  batch_number?: string;
  expiration_date?: Date;
  created_at: Date;
}
