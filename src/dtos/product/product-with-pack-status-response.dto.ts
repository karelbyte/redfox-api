import { ProductResponseDto } from './product-response.dto';

export class ProductWithPackStatusResponseDto {
  product: ProductResponseDto;
  pack_sync_success: boolean;
  pack_sync_error?: string;
}
