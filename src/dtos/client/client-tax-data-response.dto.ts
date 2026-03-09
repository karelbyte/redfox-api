export class ClientTaxDataResponseDto {
  id: string;
  tax_document: string;
  tax_system?: string;
  tax_name?: string;
  default_invoice_use?: string;
  is_main: boolean;
  created_at: Date;
}
