export class CloseWarehouseResponseDto {
  warehouseId: string;
  warehouseName: string;
  transferredProducts: number;
  totalQuantity: number;
  message: string;
  closedAt: Date;
} 