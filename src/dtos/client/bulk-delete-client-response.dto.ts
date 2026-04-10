import { ClientResponseDto } from './client-response.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class BulkDeleteResultDto {
  id: string;
  code: string;
  name: string;
  success: boolean;
  error?: string;
}

export class BulkDeleteClientResponseDto {
  @ValidateNested({ each: true })
  @Type(() => BulkDeleteResultDto)
  results: BulkDeleteResultDto[];
}
