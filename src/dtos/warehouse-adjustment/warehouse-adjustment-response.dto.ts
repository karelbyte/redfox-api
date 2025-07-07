import { WarehouseResponseDto } from '../warehouse/warehouse-response.dto';
import { WarehouseAdjustmentDetailResponseDto } from './warehouse-adjustment-detail-response.dto';

export class WarehouseAdjustmentResponseDto {
  id: string;
  code: string;
  sourceWarehouse: WarehouseResponseDto;
  targetWarehouse: WarehouseResponseDto;
  date: Date;
  description: string;
  status: boolean;
  details: WarehouseAdjustmentDetailResponseDto[];
  created_at: Date;
} 