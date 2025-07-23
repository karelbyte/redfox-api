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
      document: provider.document,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      status: provider.status,
      created_at: provider.created_at,
    };
  }
}
