import { Injectable } from '@nestjs/common';
import { Client } from '../../models/client.entity';
import { ClientResponseDto } from '../../dtos/client/client-response.dto';

@Injectable()
export class ClientMapper {
  mapToResponseDto(client: Client): ClientResponseDto {
    if (!client) {
      throw new Error('Client cannot be null');
    }

    const primaryTaxData = (client.taxData || []).find(td => td.is_main) || client.taxData?.[0];

    return {
      id: client.id,
      code: client.code,
      name: client.name,
      description: client.description,
      phone: client.phone,
      email: client.email,
      tax_document: primaryTaxData?.tax_document || '',
      pack_client_id: client.pack_client_id,
      pack_client_response: client.pack_client_response,
      status: client.status,
      balance: Number(client.balance || 0),
      created_at: client.created_at,
      addresses: (client.addresses || []).map(addr => ({
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
      taxData: (client.taxData || []).map(tax => ({
        id: tax.id,
        tax_document: tax.tax_document,
        tax_system: tax.tax_system,
        tax_name: tax.tax_name,
        default_invoice_use: tax.default_invoice_use,
        is_main: tax.is_main,
        created_at: tax.created_at,
      })),
      credit: client.credit ? {
        id: client.credit.id,
        credit_limit: client.credit.credit_limit,
        credit_days: client.credit.credit_days,
        is_active: client.credit.is_active,
        currency_id: client.credit.currency_id,
        created_at: client.credit.createdAt,
      } : undefined,
    };
  }
}
