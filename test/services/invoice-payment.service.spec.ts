import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InvoicePaymentService', () => {
  let service: any;
  let invoiceRepository: any;
  let invoicePaymentRepository: any;
  let accountReceivableRepository: any;
  let certificationPackFactory: any;
  let accountReceivableService: any;
  let tenantContext: any;
  let translationService: any;

  beforeEach(async () => {
    invoiceRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    invoicePaymentRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    accountReceivableRepository = {
      findOne: jest.fn(),
    };

    certificationPackFactory = {
      getPackService: jest.fn(),
    };

    accountReceivableService = {
      addPayment: jest.fn(),
    };

    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    };

    translationService = {
      translate: jest.fn(),
    };

    service = {
      get organizationId() {
        return tenantContext.getOrganizationId() as string;
      },

      mapToDto(payment: any) {
        return {
          id: payment.id,
          invoice_id: payment.invoice_id,
          payment_number: payment.payment_number,
          amount: Number(payment.amount),
          payment_date: payment.payment_date,
          payment_form: payment.payment_form,
          balance_before: Number(payment.balance_before),
          balance_after: Number(payment.balance_after),
          status: payment.status,
          pack_complement_id: payment.pack_complement_id ?? null,
          cfdi_complement_uuid: payment.cfdi_complement_uuid ?? null,
          notes: payment.notes ?? null,
          created_at: payment.created_at,
        };
      },

      async getPayments(invoiceId: string) {
        const invoice = await invoiceRepository.findOne({
          where: { id: invoiceId, organization_id: service.organizationId },
        });
        if (!invoice)
          throw new NotFoundException(
            await translationService.translate('invoice.not_found'),
          );

        const payments = await invoicePaymentRepository.find({
          where: { invoice_id: invoiceId, organization_id: service.organizationId },
          order: { payment_number: 'ASC' },
        });

        return payments.map((p: any) => service.mapToDto(p));
      },

      async registerPayment(invoiceId: string, dto: any) {
        const invoice = await invoiceRepository.findOne({
          where: { id: invoiceId, organization_id: service.organizationId },
        });

        if (!invoice)
          throw new NotFoundException(
            await translationService.translate('invoice.not_found'),
          );

        if (invoice.status === 'CANCELLED') {
          const message = await translationService.translate(
            'invoice_payment.cannot_pay_cancelled',
          );
          throw new BadRequestException(message);
        }

        if (invoice.status === 'PAID') {
          throw new BadRequestException(
            await translationService.translate('invoice.already_paid'),
          );
        }

        if (!invoice.cfdi_uuid) {
          throw new BadRequestException(
            await translationService.translate('invoice.must_be_stamped'),
          );
        }

        const existingPayments = await invoicePaymentRepository.find({
          where: { invoice_id: invoiceId, organization_id: service.organizationId },
          order: { payment_number: 'ASC' },
        });

        const totalPaid = existingPayments
          .filter((p: any) => p.status !== 'CANCELLED')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        const balanceBefore =
          Math.round((Number(invoice.total_amount) - totalPaid) * 100) / 100;

        if (balanceBefore <= 0) {
          throw new BadRequestException(
            await translationService.translate('invoice.already_paid'),
          );
        }

        if (dto.amount > balanceBefore) {
          throw new BadRequestException(
            `Payment amount (${dto.amount}) exceeds remaining balance (${balanceBefore})`,
          );
        }

        const balanceAfter = Math.round((balanceBefore - dto.amount) * 100) / 100;
        const paymentNumber =
          existingPayments.filter(
            (p: any) => p.status !== 'CANCELLED',
          ).length + 1;

        const payment = invoicePaymentRepository.create({
          invoice_id: invoiceId,
          organization_id: service.organizationId,
          payment_number: paymentNumber,
          amount: dto.amount,
          payment_date: new Date(dto.payment_date) as any,
          payment_form: dto.payment_form,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          status: 'PENDING',
          notes: dto.notes,
        });

        const savedPayment = await invoicePaymentRepository.save(payment);

        try {
          const packService = await certificationPackFactory.getPackService();

          if (!packService.generatePaymentComplement) {
            throw new BadRequestException(
              await translationService.translate('invoice.pac_no_complement'),
            );
          }

          const complementResult = await packService.generatePaymentComplement({
            cfdi_uuid: invoice.cfdi_uuid,
            payment_number: paymentNumber,
            payment_date: dto.payment_date,
            amount: dto.amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            payment_form: dto.payment_form,
            pack_invoice_id: invoice.pack_invoice_id,
          });

          savedPayment.status = 'STAMPED';
          savedPayment.pack_complement_id = complementResult.id;
          savedPayment.cfdi_complement_uuid = complementResult.complement_uuid;
          savedPayment.pack_complement_response = {
            id: complementResult.id,
            complement_uuid: complementResult.complement_uuid,
            invoice_uuid: complementResult.invoice_uuid,
            pdf_url: complementResult.pdf_url,
            xml_url: complementResult.xml_url,
          };

          await invoicePaymentRepository.save(savedPayment);

          const accountReceivable = await accountReceivableRepository.findOne({
            where: { invoiceId: invoiceId, organization_id: service.organizationId },
          });

          if (accountReceivable) {
            const paymentMethodMap: Record<string, string> = {
              '01': 'CASH',
              '02': 'CHECK',
              '03': 'BANK_TRANSFER',
              '04': 'CREDIT_CARD',
              '28': 'DEBIT_CARD',
              '29': 'DEBIT_CARD',
            };
            const arPaymentMethod =
              paymentMethodMap[dto.payment_form] || 'OTHER';

            await accountReceivableService.addPayment(
              {
                accountReceivableId: accountReceivable.id,
                amount: dto.amount,
                paymentDate: dto.payment_date,
                paymentMethod: arPaymentMethod,
                reference: savedPayment.cfdi_complement_uuid || savedPayment.id,
                notes: dto.notes || `Complemento de pago #${paymentNumber}`,
              },
              service.organizationId,
            );
          }

          if (balanceAfter === 0) {
            invoice.status = 'PAID';
            await invoiceRepository.save(invoice);
          }
        } catch (error: any) {
          console.error('Error stamping payment complement:', error);
          throw new BadRequestException(
            `Payment registered but complement stamping failed: ${error.message}`,
          );
        }

        return service.mapToDto(savedPayment);
      },

      async cancelPayment(invoiceId: string, paymentId: string, reason?: string) {
        const payment = await invoicePaymentRepository.findOne({
          where: {
            id: paymentId,
            invoice_id: invoiceId,
            organization_id: service.organizationId,
          },
        });

        if (!payment)
          throw new NotFoundException(
            await translationService.translate('invoice.not_found'),
          );

        if (payment.status === 'CANCELLED') {
          throw new BadRequestException(
            await translationService.translate(
              'invoice.payment_already_cancelled',
            ),
          );
        }

        if (
          payment.status === 'STAMPED' &&
          payment.cfdi_complement_uuid
        ) {
          const packService = await certificationPackFactory.getPackService();
          if (packService.cancelPaymentComplement) {
            await packService.cancelPaymentComplement(
              payment.cfdi_complement_uuid,
              reason || '01',
            );
          }
        }

        payment.status = 'CANCELLED';
        await invoicePaymentRepository.save(payment);

        const invoice = await invoiceRepository.findOne({
          where: { id: invoiceId, organization_id: service.organizationId },
        });
        if (invoice?.status === 'PAID') {
          invoice.status = 'SENT';
          await invoiceRepository.save(invoice);
        }
      },
    };
  });

  describe('getPayments', () => {
    const invoiceId = 'inv-123';

    it('should return payments for invoice', async () => {
      const mockInvoice = { id: invoiceId, total_amount: 1000 };
      const mockPayments = [
        {
          id: 'p-1',
          invoice_id: invoiceId,
          payment_number: 1,
          amount: 500,
          payment_date: new Date(),
          payment_form: '01',
          balance_before: 1000,
          balance_after: 500,
          status: 'STAMPED',
          created_at: new Date(),
        },
      ];

      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      invoicePaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getPayments(invoiceId);

      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organization_id: 'org-123' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(service.mapToDto(mockPayments[0]));
    });

    it('should throw error if invoice not found', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Invoice not found');

      await expect(service.getPayments(invoiceId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('registerPayment', () => {
    const invoiceId = 'inv-123';
    const createPaymentDto = {
      amount: 500,
      payment_date: '2023-01-15',
      payment_form: '01',
      notes: 'Test payment',
    };

    it('should register payment successfully', async () => {
      const mockInvoice = {
        id: invoiceId,
        total_amount: 1000,
        cfdi_uuid: 'cfdi-123',
        status: 'SENT',
        pack_invoice_id: 'pack-123',
      };

      const mockPayment = {
        id: 'p-123',
        invoice_id: invoiceId,
        payment_number: 1,
        amount: 500,
        payment_date: new Date(),
        payment_form: '01',
        balance_before: 1000,
        balance_after: 500,
        status: 'PENDING',
        notes: 'Test payment',
      };

      const mockPackService = {
        generatePaymentComplement: jest.fn().mockResolvedValue({
          id: 'comp-123',
          complement_uuid: 'comp-uuid-123',
          invoice_uuid: 'inv-uuid-123',
          pdf_url: 'pdf-url',
          xml_url: 'xml-url',
        }),
        cancelPaymentComplement: jest.fn(),
      };

      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      invoicePaymentRepository.find.mockResolvedValue([]);
      invoicePaymentRepository.create.mockReturnValue(mockPayment);
      invoicePaymentRepository.save.mockResolvedValue(mockPayment);
      certificationPackFactory.getPackService.mockResolvedValue(mockPackService);
      accountReceivableRepository.findOne.mockResolvedValue({
        id: 'ar-123',
      });
      accountReceivableService.addPayment.mockResolvedValue(undefined);

      const result = await service.registerPayment(invoiceId, createPaymentDto);

      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organization_id: 'org-123' },
      });
      expect(invoicePaymentRepository.create).toHaveBeenCalledWith({
        invoice_id: invoiceId,
        organization_id: 'org-123',
        payment_number: 1,
        amount: 500,
        payment_date: new Date('2023-01-15'),
        payment_form: '01',
        balance_before: 1000,
        balance_after: 500,
        status: 'PENDING',
        notes: 'Test payment',
      });
      expect(mockPackService.generatePaymentComplement).toHaveBeenCalledWith({
        cfdi_uuid: 'cfdi-123',
        payment_number: 1,
        payment_date: '2023-01-15',
        amount: 500,
        balance_before: 1000,
        balance_after: 500,
        payment_form: '01',
        pack_invoice_id: 'pack-123',
      });
      expect(result).toEqual(service.mapToDto({
        ...mockPayment,
        status: 'STAMPED',
        pack_complement_id: 'comp-123',
        cfdi_complement_uuid: 'comp-uuid-123',
      }));
    });

    it('should throw error if invoice not found', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Invoice not found');

      await expect(service.registerPayment(invoiceId, createPaymentDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if invoice is cancelled', async () => {
      const mockInvoice = { id: invoiceId, status: 'CANCELLED' };
      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      translationService.translate.mockResolvedValue('Cannot pay cancelled invoice');

      await expect(service.registerPayment(invoiceId, createPaymentDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if invoice is already paid', async () => {
      const mockInvoice = { id: invoiceId, status: 'PAID' };
      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      translationService.translate.mockResolvedValue('Invoice already paid');

      await expect(service.registerPayment(invoiceId, createPaymentDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if invoice is not stamped', async () => {
      const mockInvoice = { id: invoiceId, status: 'SENT', cfdi_uuid: null };
      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      translationService.translate.mockResolvedValue('Invoice must be stamped');

      await expect(service.registerPayment(invoiceId, createPaymentDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if payment amount exceeds balance', async () => {
      const mockInvoice = {
        id: invoiceId,
        total_amount: 1000,
        cfdi_uuid: 'cfdi-123',
        status: 'SENT',
      };

      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      invoicePaymentRepository.find.mockResolvedValue([]);
      translationService.translate.mockResolvedValue('Invoice already paid');

      await expect(service.registerPayment(invoiceId, { ...createPaymentDto, amount: 1500 })).rejects.toThrow(BadRequestException);
    });

    it('should handle stamping failure', async () => {
      const mockInvoice = {
        id: invoiceId,
        total_amount: 1000,
        cfdi_uuid: 'cfdi-123',
        status: 'SENT',
      };

      const mockPayment = {
        id: 'p-123',
        status: 'PENDING',
      };

      const mockPackService = {
        generatePaymentComplement: jest.fn().mockRejectedValue(new Error('Stamping failed')),
      };

      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      invoicePaymentRepository.find.mockResolvedValue([]);
      invoicePaymentRepository.create.mockReturnValue(mockPayment);
      invoicePaymentRepository.save.mockResolvedValue(mockPayment);
      certificationPackFactory.getPackService.mockResolvedValue(mockPackService);

      await expect(service.registerPayment(invoiceId, createPaymentDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should mark invoice as paid when balance is zero', async () => {
      const mockInvoice = {
        id: invoiceId,
        total_amount: 1000,
        cfdi_uuid: 'cfdi-123',
        status: 'SENT',
        pack_invoice_id: 'pack-123',
      };

      const mockPayment = {
        id: 'p-123',
        status: 'STAMPED',
      };

      const mockPackService = {
        generatePaymentComplement: jest.fn().mockResolvedValue({
          id: 'comp-123',
          complement_uuid: 'comp-uuid-123',
        }),
      };

      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      invoicePaymentRepository.find.mockResolvedValue([]);
      invoicePaymentRepository.create.mockReturnValue(mockPayment);
      invoicePaymentRepository.save.mockResolvedValue(mockPayment);
      certificationPackFactory.getPackService.mockResolvedValue(mockPackService);
      accountReceivableRepository.findOne.mockResolvedValue(null);

      await service.registerPayment(invoiceId, { ...createPaymentDto, amount: 1000 });

      expect(invoiceRepository.save).toHaveBeenCalledWith({
        ...mockInvoice,
        status: 'PAID',
      });
    });
  });

  describe('cancelPayment', () => {
    const invoiceId = 'inv-123';
    const paymentId = 'p-123';

    it('should cancel payment successfully', async () => {
      const mockPayment = {
        id: paymentId,
        invoice_id: invoiceId,
        status: 'STAMPED',
        cfdi_complement_uuid: 'comp-uuid-123',
      };

      const mockPackService = {
        cancelPaymentComplement: jest.fn().mockResolvedValue(undefined),
      };

      invoicePaymentRepository.findOne.mockResolvedValue(mockPayment);
      invoicePaymentRepository.save.mockResolvedValue(mockPayment);
      certificationPackFactory.getPackService.mockResolvedValue(mockPackService);

      await service.cancelPayment(invoiceId, paymentId, '01');

      expect(invoicePaymentRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: paymentId,
          invoice_id: invoiceId,
          organization_id: 'org-123',
        },
      });
      expect(mockPackService.cancelPaymentComplement).toHaveBeenCalledWith('comp-uuid-123', '01');
      expect(invoicePaymentRepository.save).toHaveBeenCalledWith({
        ...mockPayment,
        status: 'CANCELLED',
      });
    });

    it('should throw error if payment not found', async () => {
      invoicePaymentRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Payment not found');

      await expect(service.cancelPayment(invoiceId, paymentId)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if payment already cancelled', async () => {
      const mockPayment = {
        id: paymentId,
        status: 'CANCELLED',
      };

      invoicePaymentRepository.findOne.mockResolvedValue(mockPayment);
      translationService.translate.mockResolvedValue('Payment already cancelled');

      await expect(service.cancelPayment(invoiceId, paymentId)).rejects.toThrow(BadRequestException);
    });

    it('should revert invoice status if it was PAID', async () => {
      const mockPayment = {
        id: paymentId,
        invoice_id: invoiceId,
        status: 'STAMPED',
      };

      const mockInvoice = {
        id: invoiceId,
        status: 'PAID',
      };

      invoicePaymentRepository.findOne.mockResolvedValue(mockPayment);
      invoicePaymentRepository.save.mockResolvedValue(mockPayment);
      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      invoiceRepository.save.mockResolvedValue(mockInvoice);

      await service.cancelPayment(invoiceId, paymentId);

      expect(invoiceRepository.save).toHaveBeenCalledWith({
        ...mockInvoice,
        status: 'SENT',
      });
    });

    it('should handle pending payment cancellation', async () => {
      const mockPayment = {
        id: paymentId,
        invoice_id: invoiceId,
        status: 'PENDING',
        cfdi_complement_uuid: null,
      };

      const mockPackService = {
        cancelPaymentComplement: jest.fn(),
      };

      invoicePaymentRepository.findOne.mockResolvedValue(mockPayment);
      invoicePaymentRepository.save.mockResolvedValue(mockPayment);
      certificationPackFactory.getPackService.mockResolvedValue(mockPackService);

      await service.cancelPayment(invoiceId, paymentId);

      expect(mockPackService.cancelPaymentComplement).not.toHaveBeenCalled();
      expect(invoicePaymentRepository.save).toHaveBeenCalledWith({
        ...mockPayment,
        status: 'CANCELLED',
      });
    });
  });

  describe('mapToDto', () => {
    it('should map payment to DTO correctly', () => {
      const mockPayment = {
        id: 'p-123',
        invoice_id: 'inv-123',
        payment_number: 1,
        amount: 500,
        payment_date: new Date(),
        payment_form: '01',
        balance_before: 1000,
        balance_after: 500,
        status: 'STAMPED',
        pack_complement_id: 'comp-123',
        cfdi_complement_uuid: 'comp-uuid-123',
        notes: 'Test payment',
        created_at: new Date(),
      };

      const result = service.mapToDto(mockPayment);

      expect(result).toEqual({
        id: 'p-123',
        invoice_id: 'inv-123',
        payment_number: 1,
        amount: 500,
        payment_date: mockPayment.payment_date,
        payment_form: '01',
        balance_before: 1000,
        balance_after: 500,
        status: 'STAMPED',
        pack_complement_id: 'comp-123',
        cfdi_complement_uuid: 'comp-uuid-123',
        notes: 'Test payment',
        created_at: mockPayment.created_at,
      });
    });

    it('should handle null values correctly', () => {
      const mockPayment = {
        id: 'p-123',
        invoice_id: 'inv-123',
        payment_number: 1,
        amount: 500,
        payment_date: new Date(),
        payment_form: '01',
        balance_before: 1000,
        balance_after: 500,
        status: 'PENDING',
        pack_complement_id: null,
        cfdi_complement_uuid: null,
        notes: null,
        created_at: new Date(),
      };

      const result = service.mapToDto(mockPayment);

      expect(result.pack_complement_id).toBeNull();
      expect(result.cfdi_complement_uuid).toBeNull();
      expect(result.notes).toBeNull();
    });
  });
});
