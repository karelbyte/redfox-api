import { TaxType } from '../../models/tax.entity';

export class TaxResponseDto {
  id: string;
  code: string;
  name: string;
  value: number;
  type: TaxType;
  isActive: boolean;
  createdAt: Date;
}
