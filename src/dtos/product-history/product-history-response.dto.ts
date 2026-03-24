import { OperationType } from '../../models/product-history.entity';

export class ProductHistoryResponseDto {
  id: string;
  product: {
    id: string;
    sku: string;
    description: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  } | null;
  operation_type: OperationType;
  operation_id: string;
  quantity: number;
  current_stock: number;
  batch_number?: string;
  expiration_date?: Date;
  created_at: Date;
}
