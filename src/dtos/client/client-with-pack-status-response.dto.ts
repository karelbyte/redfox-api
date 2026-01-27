import { ClientResponseDto } from './client-response.dto';

export class ClientWithPackStatusResponseDto {
  client: ClientResponseDto;
  pack_sync_success: boolean;
  pack_sync_error?: string;
}

