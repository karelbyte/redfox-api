import { Injectable } from '@nestjs/common';
import { Provider } from '../../models/provider.entity';
import { ProviderResponseDto } from '../../dtos/provider/provider-response.dto';

@Injectable()
export class ProviderMapper {
  mapToResponseDto(provider: Provider): ProviderResponseDto {
    if (!provider) {
      throw new Error('Provider cannot be null');
    }

    return {
      id: provider.id,
      code: provider.code,
      description: provider.description,
      name: provider.name,
      status: provider.status,
      balance: Number(provider.balance || 0),
      created_at: provider.created_at,
      phone: provider.phone,
      email: provider.email,
      addresses: (provider.addresses || []).map(addr => ({
        id: addr.id,
        type: addr.type,
        street: addr.street,
        exterior_number: addr.exterior_number,
        interior_number: addr.interior_number,
        neighborhood: addr.neighborhood,
        city: addr.city,
        municipality: addr.municipality,
        zip_code: addr.zip_code,
        state: addr.state,
        country: addr.country,
        is_main: addr.is_main,
        created_at: addr.created_at,
      })),
      taxData: (provider.taxData || []).map(tax => ({
        id: tax.id,
        tax_document: tax.tax_document,
        tax_system: tax.tax_system,
        tax_name: tax.tax_name,
        default_invoice_use: tax.default_invoice_use,
        is_main: tax.is_main,
        created_at: tax.created_at,
      })),
      credit: provider.credit ? {
        id: provider.credit.id,
        credit_limit: provider.credit.credit_limit,
        credit_days: provider.credit.credit_days,
        is_active: provider.credit.is_active,
        currency_id: provider.credit.currency_id,
        created_at: provider.credit.created_at,
      } : undefined,
    };
  }
}
