import { AddressType } from '../../models/client-address.entity';

export class ClientAddressResponseDto {
  id: string;
  type: AddressType;
  street?: string;
  exterior_number?: string;
  interior_number?: string;
  neighborhood?: string;
  city?: string;
  municipality?: string;
  zip_code?: string;
  state?: string;
  country: string;
  is_main: boolean;
  created_at: Date;
}
