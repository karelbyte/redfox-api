import { ICreateInvoice } from './create-invoice-payload.interface';
import { ISunatInvoiceResponse } from './sunat-response.interface';

/** Configuración de transporte para una llamada a la API de SUNAT. */
export interface ISunatRequestConfig {
  url: string;
  headers: Record<string, string>;
}

export interface ISunatApiService {
  createInvoice(
    data: ICreateInvoice,
    config: ISunatRequestConfig,
  ): Promise<ISunatInvoiceResponse>;
}
