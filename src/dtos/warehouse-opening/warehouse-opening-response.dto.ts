import { ProductResponseDto } from '../product/product-response.dto';

export class WarehouseOpeningResponseDto {
  id: string;
  warehouseId: string;
  product: ProductResponseDto;
  quantity: number;
  price: number;
  createdAt: Date;
}
