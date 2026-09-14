export type SunatEstado = 'ACEPTADO' | 'RECHAZADO' | 'PENDIENTE';

export interface ISunatPdfUrls {
  ticket: string;
  a4: string;
}

export interface ISunatPayload {
  estado: SunatEstado;
  hash: string;
  xml: string;
  cdr: string;
  pdf: ISunatPdfUrls;
}

export interface ISunatInvoiceResponse {
  success: boolean;
  message: string;
  payload: ISunatPayload;
}