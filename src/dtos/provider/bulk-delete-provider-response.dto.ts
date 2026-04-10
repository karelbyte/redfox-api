export class BulkDeleteProviderResultDto {
  id: string;
  code: string;
  name: string;
  success: boolean;
  error?: string;
}

export class BulkDeleteProviderResponseDto {
  results: BulkDeleteProviderResultDto[];
  totalRequested: number;
  totalDeleted: number;
  totalFailed: number;
}
