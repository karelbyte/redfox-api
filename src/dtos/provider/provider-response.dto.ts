import { ProviderAddressResponseDto, ProviderCreditResponseDto, ProviderTaxDataResponseDto } from "./provider-related-response.dto";

export class ProviderResponseDto {
  id: string;
  code: string;
  description: string;
  name: string;
  status: boolean;
  phone?: string;
  email?: string;
  addresses?: ProviderAddressResponseDto[];
  taxData?: ProviderTaxDataResponseDto[];
  balance: number;
  credit?: ProviderCreditResponseDto;
  created_at: Date;
}
