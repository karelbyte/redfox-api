import { ClientAddressResponseDto } from './client-address-response.dto';
import { ClientTaxDataResponseDto } from './client-tax-data-response.dto';
import { ClientCreditResponseDto } from './client-credit-response.dto';

export class ClientResponseDto {
  id: string;
  code: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  tax_document?: string;
  status: boolean;
  pack_client_id?: string;
  pack_client_response?: any;
  addresses: ClientAddressResponseDto[];
  taxData: ClientTaxDataResponseDto[];
  balance: number;
  credit?: ClientCreditResponseDto;
  created_at: Date;
}
