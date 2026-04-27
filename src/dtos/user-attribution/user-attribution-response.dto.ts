import { AttributionType } from '../../models/user-attribution.entity';

export class UserAttributionResponseDto {
  id: string;
  userId: string;
  attributionType: AttributionType;
  resourceId: string;
  resourceType: string;
  permissions: Record<string, boolean> | null;
  createdAt: Date;
  updatedAt: Date;
}
