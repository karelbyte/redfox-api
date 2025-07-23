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
      address,
      phone,
      email,
      status,
      created_at,
    } = client;
    return {
      id,
      code,
      name,
      tax_document,
      description,
      address,
      phone,
      email,
      status,
      created_at,
    };
  }
}
