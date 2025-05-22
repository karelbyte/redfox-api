import { BrandResponseDto } from '../brand/brand-response.dto';
import { ProviderResponseDto } from '../provider/provider-response.dto';
import { MeasurementUnitResponseDto } from '../measurement-unit/measurement-unit-response.dto';

export class ProductResponseDto {
  id: string;
  code: string;
  description: string;
  price: number;
  stock: number;
  min_stock: number;
  brand?: BrandResponseDto;
  provider?: ProviderResponseDto;
  measurement_unit: MeasurementUnitResponseDto;
  status: boolean;
  created_at: Date;
} 