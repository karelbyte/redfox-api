import { ProductResponseDto } from '../product/product-response.dto';

export class ReceptionDetailResponseDto {
  id: string;
  product: ProductResponseDto;
  quantity: number;
  created_at: Date;
} 