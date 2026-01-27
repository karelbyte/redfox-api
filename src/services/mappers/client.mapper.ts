import { Injectable } from '@nestjs/common';
import { Client } from '../../models/client.entity';
import { ClientResponseDto } from '../../dtos/client/client-response.dto';

@Injectable()
export class ClientMapper {
  mapToResponseDto(client: Client): ClientResponseDto {
    if (!client) {
      throw new Error('Client cannot be null');
    }

    const {
      id,
      code,
      name,
      tax_document,
      description,
      address_street,
      address_exterior,
      address_interior,
      address_neighborhood,
      address_city,
      address_municipality,
      address_zip,
      address_state,
      address_country,
      phone,
      email,
      tax_system,
      default_invoice_use,
      pack_product_id,
      pack_product_response,
      status,
      created_at,
    } = client;
    return {
      id,
      code,
      name,
      tax_document,
      description,
      address_street,
      address_exterior,
      address_interior,
      address_neighborhood,
      address_city,
      address_municipality,
      address_zip,
      address_state,
      address_country,
      phone,
      email,
      tax_system,
      default_invoice_use,
      pack_product_id,
      pack_product_response,
      status,
      created_at,
    };
  }
}
