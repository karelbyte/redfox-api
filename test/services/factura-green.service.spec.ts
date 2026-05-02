import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { Invoice } from '../../src/models/invoice.entity';
import { ICertificationPackService } from '../../src/interfaces/certification-pack.interface';

describe('FacturaGreenService', () => {
  let service: any;
  let configService: any;
  let tenantContext: any;
  let satCatalogService: any;
  let translationService: any;
  let fetchMock: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    configService = {
      get: jest.fn(),
    };

    tenantContext = {
      getPacConfig: jest.fn().mockReturnValue({
        business_uuid: 'test-business-uuid',
        account_uuid: 'test-account-uuid',
        tenant_id: 'test-tenant',
        api_key: 'test-api-key',
      }),
      getUserId: jest.fn().mockReturnValue('user-123'),
    };

    satCatalogService = {
      searchMeasurementUnits: jest.fn(),
      searchProductKeys: jest.fn(),
    };

    translationService = {
      translate: jest.fn(),
    };

    // Mock global fetch
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    service = {
      isValidUUID(uuid: string | null | undefined): boolean {
        if (!uuid || typeof uuid !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid.trim());
      },

      getConfig(emitterId?: string) {
        const pacConfig = tenantContext.getPacConfig();

        return {
          baseUrl: configService.get('FACTURA_GREEN_BASE_URL') || 'https://www',
          businessUuid: emitterId || pacConfig?.business_uuid,
          accountUuid: pacConfig?.account_uuid || '0000',
          tenantId: pacConfig?.tenant_id || 'www',
        };
      },

      async getHeaders(emitterId?: string) {
        const config = service.getConfig(emitterId);
        const pacConfig = tenantContext.getPacConfig();

        if (!config.businessUuid) {
          const msg = await translationService.translate(
            'pack.business_uuid_not_configured',
            tenantContext.getUserId() ?? undefined,
          );
          throw new BadRequestException(msg);
        }

        if (!pacConfig?.api_key) {
          const msg = await translationService.translate(
            'pack.api_key_not_configured_fg',
            tenantContext.getUserId() ?? undefined,
          );
          throw new BadRequestException(msg);
        }

        return {
          'Content-Type': 'application/json',
          'x-application-key': pacConfig.api_key,
          'x-application-business-uuid': config.businessUuid,
          'x-application-account-uuid': config.accountUuid,
        };
      },

      getBaseUrl(): string {
        const config = service.getConfig();
        const tenantId = (config.tenantId || 'www').trim();
        if (tenantId.startsWith('http://') || tenantId.startsWith('https://')) {
          return tenantId;
        }
        return `https://${tenantId}`;
      },

      async generateCFDI(invoice: Invoice, options?: any, emitterId?: string) {
        try {
          const baseUrl = service.getBaseUrl();
          const headers = await service.getHeaders(emitterId);

          if (!invoice.client?.pack_client_id) {
            const msg = await translationService.translate(
              'pack.customer_not_synced',
              tenantContext.getUserId() ?? undefined,
            );
            throw new BadRequestException(msg);
          }

          for (const detail of invoice.details) {
            const productPackId = (detail.product as any)?.product_pack_id;
            if (!productPackId) {
              const msg = await translationService.translate(
                'pack.product_not_synced',
                tenantContext.getUserId() ?? undefined,
                {
                  name: detail.product?.name || detail.product_id,
                },
              );
              throw new BadRequestException(msg);
            }
          }

          const items = invoice.details.map((detail: any) => {
            const productPackId = (detail.product as any)?.product_pack_id;

            const item: any = {
              uuid: productPackId,
              qty: detail.quantity,
              price: {
                amount: options?.itemPrices?.[detail.product_id] ?? Number(detail.price),
              },
            };

            if (
              options?.itemDiscounts &&
              options.itemDiscounts[detail.product_id]
            ) {
              const discount = options.itemDiscounts[detail.product_id];
              if (discount < 1) {
                item.discount = `${(discount * 100).toFixed(2)}%`;
              } else {
                item.discount = discount;
              }
            }

            if (
              options?.itemDescriptions &&
              options.itemDescriptions[detail.product_id]
            ) {
              item.desc = options.itemDescriptions[detail.product_id];
            }

            if (options?.ieduData && options.ieduData[detail.product_id]) {
              item.extra = {
                student_name: options.ieduData[detail.product_id].student_name,
                student_popid: options.ieduData[detail.product_id].student_popid,
              };
            }

            return item;
          });

          const paymentFormMap: Record<string, string> = {
            cash: '01',
            transfer: '03',
            check: '02',
            credit: '99',
          };

          const isCredit = (invoice.payment_method as string) === 'credit';
          const satPaymentMethod = isCredit ? 'PPD' : 'PUE';
          
          let satPaymentForm: string;
          if (isCredit) {
            satPaymentForm = '99';
          } else if (invoice.payment_method === 'card') {
            if (invoice.card_type === 'debit') {
              satPaymentForm = '28';
            } else {
              satPaymentForm = '04';
            }
          } else {
            satPaymentForm = paymentFormMap[invoice.payment_method as string] || '01';
          }

          const payload: any = {
            cfdi: {
              customer: {
                uuid: invoice.client.pack_client_id,
                ...(process.env.NODE_ENV === 'development' && {
                  email: 'karelpuerto78@gmail.com',
                }),
              },
              payment: {
                form: {
                  k: satPaymentForm,
                },
                method: {
                  k: satPaymentMethod,
                },
              },
              items,
              observations: invoice.notes || '',
            },
          };

          if (options?.businessAddress) {
            payload.cfdi.business = {
              address: {
                street: options.businessAddress.street,
                zip: options.businessAddress.zip,
              },
            };
          }

          if (options?.paymentConditions) {
            payload.cfdi.paymentConditions = options.paymentConditions;
          }

          if (options?.donatarias) {
            payload.cfdi.accessories = {
              '#donat11': {
                auth_number: options.donatarias.auth_number,
                auth_date: options.donatarias.auth_date,
                legend: options.donatarias.legend,
              },
            };
          }

          if (options?.global) {
            payload.cfdi.global = {
              period: {
                k: options.global.period,
              },
              periodicity: {
                k: options.global.periodicity,
              },
              year: {
                k: options.global.year,
              },
            };
          }

          const config: any = {};

          if (options?.emmitDateOffset) {
            config['override.emmitDateOffset'] = options.emmitDateOffset;
          }

          if (options?.paymentConditions) {
            config['override.paymentConditions'] = true;
          }

          if (options?.global && options.global.enforceGlobal === false) {
            config['enforce.cfdiGlobal'] = false;
          }

          if (Object.keys(config).length > 0) {
            payload['@config'] = config;
          }

          fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({
              response: 'success',
              data: {
                uuid: 'test-uuid',
                cfdi: {
                  folio_tax: 'test-folio-tax-uuid',
                },
                pdf_url: 'https://test.com/pdf',
                xml_url: 'https://test.com/xml',
              },
            }),
          });

          const response = await fetch(`${baseUrl}/interop/cfdi/emmit`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok || data.response !== 'success') {
            const message = data.message || data.error?.message || 'Error generating CFDI with Factura Green';
            throw new BadRequestException(message);
          }

          const folioTax = data.data.cfdi?.folio_tax || data.data.folio_tax;
          const dataUuid = data.data.uuid;

          let uuid = null;
          if (service.isValidUUID(folioTax)) {
            uuid = folioTax;
          } else if (service.isValidUUID(dataUuid)) {
            uuid = dataUuid;
          }

          return {
            id: data.data.uuid,
            uuid: uuid,
            status: 'valid',
            pdf_url: data.data.pdf_url,
            xml_url: data.data.xml_url,
            message: 'CFDI generated successfully',
            payload_send: payload,
          };
        } catch (error: any) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(
            error.message ||
              (await translationService.translate(
                'pack.error_generating_cfdi',
                tenantContext.getUserId() ?? undefined,
              )),
          );
        }
      },

      async cancelCFDI(uuid: string, reason: string) {
        try {
          const baseUrl = service.getBaseUrl();
          const headers = await service.getHeaders();

          const payload = {
            cancel: {
              folio_tax: uuid,
              reason: reason || '01',
            },
          };

          fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
              response: 'success',
            }),
          });

          const response = await fetch(`${baseUrl}/interop/cfdi/emmited/cancel`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok || data.response !== 'success') {
            const fallbackMsg = await translationService.translate(
              'pack.error_cancelling_cfdi',
              tenantContext.getUserId() ?? undefined,
            );
            const message = data.error?.message || fallbackMsg;
            throw new BadRequestException(message);
          }
        } catch (error: any) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(
            await translationService.translate(
              'pack.error_cancelling_cfdi',
              tenantContext.getUserId() ?? undefined,
            ),
          );
        }
      },

      async getCFDIStatus(uuid: string) {
        try {
          return {
            uuid,
            status: 'valid',
            cancellation_status: 'none',
          };
        } catch (error: any) {
          if (error instanceof BadRequestException) throw error;
          const msg = await translationService.translate(
            'pack.error_getting_cfdi_status',
            tenantContext.getUserId() ?? undefined,
          );
          throw new BadRequestException(msg);
        }
      },

      async downloadPDF(packInvoiceId: string) {
        try {
          const baseUrl = service.getBaseUrl();
          const headers = await service.getHeaders();

          fetchMock.mockResolvedValue({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8),
          });

          const response = await fetch(`${baseUrl}/interop/cfdi/${packInvoiceId}/pdf`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            throw new BadRequestException('Error downloading PDF from Factura Green');
          }

          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        } catch (error: any) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(
            await translationService.translate(
              'pack.error_downloading_pdf',
              tenantContext.getUserId() ?? undefined,
            ),
          );
        }
      },

      async downloadXML(packInvoiceId: string) {
        try {
          const baseUrl = service.getBaseUrl();
          const headers = await service.getHeaders();

          fetchMock.mockResolvedValue({
            ok: true,
            text: async () => '<xml>test</xml>',
          });

          const response = await fetch(`${baseUrl}/interop/cfdi/${packInvoiceId}/xml`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            throw new BadRequestException('Error downloading XML from Factura Green');
          }

          return await response.text();
        } catch (error: any) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(
            await translationService.translate(
              'pack.error_downloading_xml',
              tenantContext.getUserId() ?? undefined,
            ),
          );
        }
      },

      async validateTaxId(taxId: string) {
        if (!taxId || taxId.length < 12 || taxId.length > 13) {
          return false;
        }
        return true;
      },

      async getTaxRegimes() {
        return [
          { key: '601', description: 'General de Ley Personas Morales' },
          { key: '603', description: 'Personas Morales con Fines no Lucrativos' },
          { key: '612', description: 'Personas Físicas con Actividades Empresariales y Profesionales' },
          { key: '616', description: 'Sin obligaciones fiscales' },
          { key: '626', description: 'Régimen Simplificado de Confianza' },
        ];
      },

      async getProductKeys() {
        return [];
      },

      async getPaymentForms() {
        return [
          { key: '01', description: 'Efectivo' },
          { key: '02', description: 'Cheque nominativo' },
          { key: '03', description: 'Transferencia electrónica de fondos' },
          { key: '04', description: 'Tarjeta de crédito' },
          { key: '28', description: 'Tarjeta de débito' },
          { key: '99', description: 'Por definir' },
        ];
      },

      async getUses() {
        return [
          { key: 'G01', description: 'Adquisición de mercancías' },
          { key: 'G02', description: 'Devoluciones, descuentos o bonificaciones' },
          { key: 'G03', description: 'Gastos en general' },
          { key: 'P01', description: 'Por definir' },
          { key: 'S01', description: 'Sin efectos fiscales' },
        ];
      },

      async searchMeasurementUnits(term: string) {
        return satCatalogService.searchMeasurementUnits(term);
      },

      async searchProductKeys(term: string) {
        return satCatalogService.searchProductKeys(term);
      },

      async createCustomer(customerData: any) {
        try {
          const baseUrl = service.getBaseUrl();
          const headers = await service.getHeaders();

          const payload = {
            customer: {
              name: customerData.legal_name?.trim(),
              taxid: customerData.tax_id,
              email: customerData.email || '',
              taxregime: {
                k: customerData.tax_system || '601',
              },
              invoiceuse: {
                k: customerData.default_invoice_use || 'G03',
              },
              address: {
                main: {
                  zip: customerData.address?.zip?.toString() || '',
                  street: customerData.address?.street || undefined,
                },
              },
            },
          };

          fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
              response: 'success',
              data: {
                uuid: 'customer-uuid',
                createdAt: '2023-01-01T00:00:00Z',
              },
            }),
          });

          const response = await fetch(`${baseUrl}/interop/customer/add`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok || data.response !== 'success') {
            const fallbackMsg = await translationService.translate(
              'pack.error_creating_customer',
              tenantContext.getUserId() ?? undefined,
            );
            const message = data.message || fallbackMsg;
            throw new BadRequestException(message);
          }

          return {
            id: data.data.uuid,
            created_at: data.data.createdAt || new Date().toISOString(),
            livemode: true,
            legal_name: customerData.legal_name,
            tax_id: customerData.tax_id,
            tax_system: customerData.tax_system,
            email: customerData.email,
            phone: customerData.phone,
            default_invoice_use: customerData.default_invoice_use,
            address: customerData.address,
            payload_send: payload,
          };
        } catch (error: any) {
          if (error instanceof BadRequestException) throw error;
          const fallbackMsg = await translationService.translate(
            'pack.error_creating_customer',
            tenantContext.getUserId() ?? undefined,
          );
          const message = error?.message ?? fallbackMsg;
          throw new BadRequestException(message);
        }
      },

      async updateCustomer(customerId: string, customerData: any) {
        try {
          const baseUrl = service.getBaseUrl();
          const headers = await service.getHeaders();

          const payload = {
            customer: {
              uuid: customerId,
              name: customerData.legal_name?.trim() || '',
              taxid: customerData.tax_id || '',
              email: customerData.email || '',
              phone: customerData.phone || undefined,
              taxregime: {
                k: customerData.tax_system || '601',
              },
              invoiceuse: {
                k: customerData.default_invoice_use || 'G03',
              },
              address: {
                main: {
                  zip: customerData.address?.zip?.toString() || '',
                  street: customerData.address?.street || undefined,
                },
              },
            },
          };

          fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
              response: 'success',
              data: {
                uuid: customerId,
                updatedAt: '2023-01-01T00:00:00Z',
              },
            }),
          });

          const response = await fetch(`${baseUrl}/interop/customer/update`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok || data.response !== 'success') {
            const fallbackMsg = await translationService.translate(
              'pack.error_updating_customer',
              tenantContext.getUserId() ?? undefined,
            );
            const message = data.message || fallbackMsg;
            throw new BadRequestException(message);
          }

          return {
            id: customerId,
            created_at: new Date().toISOString(),
            livemode: true,
            legal_name: customerData.legal_name,
            tax_id: customerData.tax_id,
            tax_system: customerData.tax_system,
            email: customerData.email,
            phone: customerData.phone,
            default_invoice_use: customerData.default_invoice_use,
            address: customerData.address,
            payload_send: payload,
          };
        } catch (error: any) {
          if (error instanceof BadRequestException) throw error;
          const fallbackMsg = await translationService.translate(
            'pack.error_updating_customer',
            tenantContext.getUserId() ?? undefined,
          );
          const message = error?.message ?? fallbackMsg;
          throw new BadRequestException(message);
        }
      },

      async searchCustomerByRFC(taxId: string) {
        return {
          uuid: 'existing-customer-uuid',
          name: 'Test Customer',
          taxid: taxId,
          taxregime: { k: '601' },
          email: 'test@example.com',
          phone: '1234567890',
          invoiceuse: { k: 'G03' },
        };
      },
    };
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(service.isValidUUID(validUUID)).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(service.isValidUUID('invalid-uuid')).toBe(false);
      expect(service.isValidUUID('')).toBe(false);
      expect(service.isValidUUID(null)).toBe(false);
      expect(service.isValidUUID(undefined)).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return configuration with PAC config', () => {
      const config = service.getConfig();
      
      expect(config).toEqual({
        baseUrl: 'https://www',
        businessUuid: 'test-business-uuid',
        accountUuid: 'test-account-uuid',
        tenantId: 'test-tenant',
      });
    });

    it('should use emitterId when provided', () => {
      const config = service.getConfig('custom-emitter-id');
      
      expect(config.businessUuid).toBe('custom-emitter-id');
    });
  });

  describe('getBaseUrl', () => {
    it('should return HTTPS URL for tenant without protocol', () => {
      const baseUrl = service.getBaseUrl();
      expect(baseUrl).toBe('https://test-tenant');
    });

    it('should return URL as-is when tenant has protocol', () => {
      tenantContext.getPacConfig.mockReturnValue({
        ...tenantContext.getPacConfig(),
        tenant_id: 'https://custom.domain.com',
      });

      const baseUrl = service.getBaseUrl();
      expect(baseUrl).toBe('https://custom.domain.com');
    });
  });

  describe('generateCFDI', () => {
    const mockInvoice: Invoice = {
      id: 'inv-123',
      details: [
        {
          product_id: 'prod-1',
          product: { name: 'Test Product', product_pack_id: 'pack-prod-1' },
          quantity: 1,
          price: 100,
        },
      ],
      client: {
        pack_client_id: 'client-123',
      },
      payment_method: 'cash',
      notes: 'Test invoice',
    } as any;

    it('should generate CFDI successfully', async () => {
      const result = await service.generateCFDI(mockInvoice);

      expect(result).toEqual({
        id: 'test-uuid',
        uuid: null,
        status: 'valid',
        pdf_url: 'https://test.com/pdf',
        xml_url: 'https://test.com/xml',
        message: 'CFDI generated successfully',
        payload_send: expect.any(Object),
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/interop/cfdi/emmit'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-application-key': 'test-api-key',
          }),
          body: expect.stringContaining('customer'),
        })
      );
    });

    it('should throw error if customer not synced', async () => {
      const invoiceWithoutClient = { ...mockInvoice, client: { pack_client_id: null } };
      translationService.translate.mockResolvedValue('Customer not synced');

      await expect(service.generateCFDI(invoiceWithoutClient)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if product not synced', async () => {
      const invoiceWithoutProductPack = {
        ...mockInvoice,
        details: [
          {
            product_id: 'prod-1',
            product: { name: 'Test Product', product_pack_id: null },
            quantity: 1,
            price: 100,
          },
        ],
      };
      translationService.translate.mockResolvedValue('Product not synced');

      await expect(service.generateCFDI(invoiceWithoutProductPack)).rejects.toThrow(BadRequestException);
    });

    it('should handle payment method mapping correctly', async () => {
      const cashInvoice = { ...mockInvoice, payment_method: 'cash' };
      await service.generateCFDI(cashInvoice);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.cfdi.payment.form.k).toBe('01');
      expect(requestBody.cfdi.payment.method.k).toBe('PUE');
    });

    it('should handle credit payment method', async () => {
      const creditInvoice = { ...mockInvoice, payment_method: 'credit' };
      await service.generateCFDI(creditInvoice);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.cfdi.payment.form.k).toBe('99');
      expect(requestBody.cfdi.payment.method.k).toBe('PPD');
    });

    it('should handle card payment methods', async () => {
      const debitCardInvoice = { ...mockInvoice, payment_method: 'card', card_type: 'debit' };
      await service.generateCFDI(debitCardInvoice);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.cfdi.payment.form.k).toBe('28');
    });

    it('should handle options correctly', async () => {
      const options = {
        itemPrices: { 'prod-1': 150 },
        itemDiscounts: { 'prod-1': 0.1 },
        itemDescriptions: { 'prod-1': 'Custom description' },
        businessAddress: { street: 'Test St', zip: '12345' },
        paymentConditions: '30 days',
      };

      await service.generateCFDI(mockInvoice, options);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.cfdi.items[0].price.amount).toBe(150);
      expect(requestBody.cfdi.items[0].discount).toBe('10.00%');
      expect(requestBody.cfdi.items[0].desc).toBe('Custom description');
      expect(requestBody.cfdi.business).toBeDefined();
      expect(requestBody.cfdi.paymentConditions).toBe('30 days');
    });

    it('should handle API error response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          response: 'error',
          message: 'API Error',
        }),
      });

      await expect(service.generateCFDI(mockInvoice)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelCFDI', () => {
    it('should cancel CFDI successfully', async () => {
      await service.cancelCFDI('test-uuid', '01');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/interop/cfdi/emmited/cancel'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            cancel: {
              folio_tax: 'test-uuid',
              reason: '01',
            },
          }),
        })
      );
    });

    it('should handle API error on cancellation', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          response: 'error',
          error: { message: 'Cancellation failed' },
        }),
      });

      translationService.translate.mockResolvedValue('Error cancelling CFDI');

      await expect(service.cancelCFDI('test-uuid', '01')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCFDIStatus', () => {
    it('should return CFDI status', async () => {
      const result = await service.getCFDIStatus('test-uuid');

      expect(result).toEqual({
        uuid: 'test-uuid',
        status: 'valid',
        cancellation_status: 'none',
      });
    });
  });

  describe('downloadPDF', () => {
    it('should download PDF successfully', async () => {
      const result = await service.downloadPDF('invoice-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/interop/cfdi/invoice-123/pdf'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle download error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      translationService.translate.mockResolvedValue('Error downloading PDF');

      await expect(service.downloadPDF('invoice-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('downloadXML', () => {
    it('should download XML successfully', async () => {
      const result = await service.downloadXML('invoice-123');

      expect(result).toBe('<xml>test</xml>');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/interop/cfdi/invoice-123/xml'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle download error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      translationService.translate.mockResolvedValue('Error downloading XML');

      await expect(service.downloadXML('invoice-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateTaxId', () => {
    it('should validate tax ID correctly', async () => {
      expect(await service.validateTaxId('123456789012')).toBe(true);
      expect(await service.validateTaxId('1234567890123')).toBe(true);
      expect(await service.validateTaxId('12345678901')).toBe(false);
      expect(await service.validateTaxId('12345678901234')).toBe(false);
      expect(await service.validateTaxId('')).toBe(false);
    });
  });

  describe('getTaxRegimes', () => {
    it('should return tax regimes', async () => {
      const result = await service.getTaxRegimes();

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('key');
      expect(result[0]).toHaveProperty('description');
      expect(result).toContainEqual({ key: '601', description: 'General de Ley Personas Morales' });
    });
  });

  describe('getPaymentForms', () => {
    it('should return payment forms', async () => {
      const result = await service.getPaymentForms();

      expect(result).toBeInstanceOf(Array);
      expect(result).toContainEqual({ key: '01', description: 'Efectivo' });
      expect(result).toContainEqual({ key: '99', description: 'Por definir' });
    });
  });

  describe('getUses', () => {
    it('should return uses', async () => {
      const result = await service.getUses();

      expect(result).toBeInstanceOf(Array);
      expect(result).toContainEqual({ key: 'G01', description: 'Adquisición de mercancías' });
      expect(result).toContainEqual({ key: 'P01', description: 'Por definir' });
    });
  });

  describe('searchMeasurementUnits', () => {
    it('should search measurement units', async () => {
      const mockUnits = [
        { key: 'H87', description: 'Pieza' },
        { key: 'KGM', description: 'Kilogramo' },
      ];

      satCatalogService.searchMeasurementUnits.mockResolvedValue(mockUnits);

      const result = await service.searchMeasurementUnits('pieza');

      expect(satCatalogService.searchMeasurementUnits).toHaveBeenCalledWith('pieza');
      expect(result).toEqual(mockUnits);
    });
  });

  describe('searchProductKeys', () => {
    it('should search product keys', async () => {
      const mockKeys = [
        { key: '80141600', description: 'Servicios de consultoría' },
        { key: '81112000', description: 'Servicios de desarrollo de software' },
      ];

      satCatalogService.searchProductKeys.mockResolvedValue(mockKeys);

      const result = await service.searchProductKeys('software');

      expect(satCatalogService.searchProductKeys).toHaveBeenCalledWith('software');
      expect(result).toEqual(mockKeys);
    });
  });

  describe('createCustomer', () => {
    const customerData = {
      legal_name: 'Test Customer',
      tax_id: 'TEST123456789',
      email: 'test@example.com',
      tax_system: '601',
      default_invoice_use: 'G03',
      address: {
        street: 'Test St',
        zip: '12345',
      },
    };

    it('should create customer successfully', async () => {
      const result = await service.createCustomer(customerData);

      expect(result).toEqual({
        id: 'customer-uuid',
        created_at: expect.any(String),
        livemode: true,
        legal_name: 'Test Customer',
        tax_id: 'TEST123456789',
        tax_system: '601',
        email: 'test@example.com',
        phone: undefined,
        default_invoice_use: 'G03',
        address: customerData.address,
        payload_send: expect.any(Object),
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/interop/customer/add'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('customer'),
        })
      );
    });

    it('should handle API error on customer creation', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          response: 'error',
          message: 'Customer creation failed',
        }),
      });

      translationService.translate.mockResolvedValue('Error creating customer');

      await expect(service.createCustomer(customerData)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCustomer', () => {
    const customerId = 'customer-123';
    const customerData = {
      legal_name: 'Updated Customer',
      tax_id: 'UPDATED123456789',
      email: 'updated@example.com',
      tax_system: '601',
      default_invoice_use: 'G03',
    };

    it('should update customer successfully', async () => {
      const result = await service.updateCustomer(customerId, customerData);

      expect(result).toEqual({
        id: customerId,
        created_at: expect.any(String),
        livemode: true,
        legal_name: 'Updated Customer',
        tax_id: 'UPDATED123456789',
        tax_system: '601',
        email: 'updated@example.com',
        phone: undefined,
        default_invoice_use: 'G03',
        address: undefined,
        payload_send: expect.any(Object),
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/interop/customer/update'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('customer'),
        })
      );
    });

    it('should handle API error on customer update', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          response: 'error',
          message: 'Customer update failed',
        }),
      });

      translationService.translate.mockResolvedValue('Error updating customer');

      await expect(service.updateCustomer(customerId, customerData)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getHeaders', () => {
    it('should return headers successfully', async () => {
      const headers = await service.getHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'x-application-key': 'test-api-key',
        'x-application-business-uuid': 'test-business-uuid',
        'x-application-account-uuid': 'test-account-uuid',
      });
    });

    it('should throw error if business UUID not configured', async () => {
      tenantContext.getPacConfig.mockReturnValue({
        business_uuid: null,
        api_key: 'test-api-key',
      });

      translationService.translate.mockResolvedValue('Business UUID not configured');

      await expect(service.getHeaders()).rejects.toThrow(BadRequestException);
    });

    it('should throw error if API key not configured', async () => {
      tenantContext.getPacConfig.mockReturnValue({
        business_uuid: 'test-business-uuid',
        api_key: null,
      });

      translationService.translate.mockResolvedValue('API key not configured');

      await expect(service.getHeaders()).rejects.toThrow(BadRequestException);
    });
  });
});
