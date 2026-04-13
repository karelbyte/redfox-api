import { ShipmentStatus } from '../../models/shipment.entity';

export class ShipmentResponseDto {
  id: string;
  withdrawal_id: string;
  organization_id: string;
  shipping_address_id?: string | null;
  carrier: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipping_cost: number;
  status: ShipmentStatus;
  estimated_delivery_date?: Date | null;
  shipped_at?: Date | null;
  delivered_at?: Date | null;
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}
