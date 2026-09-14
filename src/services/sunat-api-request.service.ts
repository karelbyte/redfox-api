import { Inject, Injectable } from '@nestjs/common';
import { ICreateInvoice } from '../interfaces/create-invoice-payload.interface';
import { ISunatInvoiceResponse } from '../interfaces/sunat-response.interface';
import {
  ISunatApiService,
  ISunatRequestConfig,
} from '../interfaces/sunat-service.interface';
import { HTTP_REQUEST } from '../constants/inject-tokens';
import { IHttpRequest } from '../interfaces/http-request.interface';
import { ExternalApiException } from '../exceptions/external-api.exception';

@Injectable()
export class SunatApiRequestService implements ISunatApiService {
  private readonly provider = 'SUNAT' as const;

  constructor(
    @Inject(HTTP_REQUEST)
    private readonly httpRequest: IHttpRequest,
  ) {}

  async createInvoice(
    data: ICreateInvoice,
    config: ISunatRequestConfig,
  ): Promise<ISunatInvoiceResponse> {
    const { url, headers } = config;

    const response = await this.httpRequest.post<ISunatInvoiceResponse>(
      url,
      data,
      { headers },
    );

    this.validateResponse(response, data);

    return response;
  }

  private validateResponse(
    response: ISunatInvoiceResponse,
    request: ICreateInvoice,
  ): asserts response is ISunatInvoiceResponse {
    if (
      !response ||
      typeof response !== 'object' ||
      typeof response.success !== 'boolean'
    ) {
      throw new ExternalApiException(
        this.provider,
        'Respuesta inválida de SUNAT',
        {
          request,
          response,
        },
      );
    }

    if (response.success === false) {
      const message =
        typeof response.message === 'string'
          ? response.message
          : 'Error al crear la factura en SUNAT';
      throw new ExternalApiException(this.provider, message, {
        request,
        response,
      });
    }

    // Un comprobante rechazado por SUNAT llega con success=true: si no se
    // valida aquí, la factura se marcaría como emitida.
    if (response.payload?.estado === 'RECHAZADO') {
      const message =
        typeof response.message === 'string' && response.message
          ? `SUNAT rechazó el comprobante: ${response.message}`
          : 'SUNAT rechazó el comprobante';
      throw new ExternalApiException(this.provider, message, {
        request,
        response,
      });
    }
  }
}
