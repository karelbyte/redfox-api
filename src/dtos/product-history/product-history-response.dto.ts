import { OperationType } from '../../models/product-history.entity';

export class ProductHistoryResponseDto {
  id: string;
  product: {
    id: string;
    code: string;
    description: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  operation_type: OperationType;
  operation_id: string;
  quantity: number;
  current_stock: number;
  created_at: Date;
} 