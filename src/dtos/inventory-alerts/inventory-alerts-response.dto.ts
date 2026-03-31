export class ExpiringProductDto {
  id: string;
  productName: string;
  productSku: string;
  warehouseName: string;
  quantity: number;
  batchNumber?: string;
  expirationDate: Date;
  daysUntilExpiry: number;
  priority: 'urgent' | 'high' | 'medium';
}

export class LowStockProductDto {
  id: string;
  productName: string;
  productSku: string;
  currentStock: number;
  minStock: number;
  stockPercentage: number;
  priority: 'urgent' | 'high' | 'medium';
}

export class InventoryAlertsResponseDto {
  expiringProducts: ExpiringProductDto[];
  lowStockProducts: LowStockProductDto[];
  totalAlerts: number;
  urgentAlerts: number;
}