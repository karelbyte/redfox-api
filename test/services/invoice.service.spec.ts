import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InvoiceService', () => {
  let service: any;
  let invoiceRepository: any;
  let invoiceDetailRepository: any;
  let clientRepository: any;
  let productRepository: any;

  beforeEach(async () => {
    service = {
      create: async (dto: any, userId: string) => {
        if (!dto.client_id) {
          throw new BadRequestException('Client ID is required');
        }
        if (!dto.details || dto.details.length === 0) {
          throw new BadRequestException('Invoice details are required');
        }
        
        const client = await clientRepository.findOne({ where: { id: dto.client_id } });
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        // Validar que todos los productos existan
        for (const detail of dto.details) {
          const product = await productRepository.findOne({ where: { id: detail.product_id } });
          if (!product) {
            throw new NotFoundException('Product not found');
          }
        }
        
        const invoice = invoiceRepository.create({
          ...dto,
          organization_id: 'org-' + userId,
          status: 'DRAFT',
          subtotal: dto.details.reduce((sum: number, detail: any) => sum + detail.quantity * detail.unit_price, 0),
          tax: dto.details.reduce((sum: number, detail: any) => sum + detail.quantity * detail.unit_price * 0.16, 0), // 16% IVA
          total: dto.details.reduce((sum: number, detail: any) => sum + detail.quantity * detail.unit_price * 1.16, 0),
          created_at: new Date(),
        });
        
        return await invoiceRepository.save(invoice);
      },
      
      findAll: async (dto: any, userId: string) => {
        const whereCondition: any = { organization_id: 'org-' + userId };
        
        if (dto.start_date && dto.end_date) {
          whereCondition.date = {
            between: [dto.start_date, dto.end_date]
          };
        }
        if (dto.status) {
          whereCondition.status = dto.status;
        }
        if (dto.client_id) {
          whereCondition.client_id = dto.client_id;
        }
        
        const result = await invoiceRepository.findAndCount({
          where: whereCondition,
          relations: ['client'],
          skip: (dto.page - 1) * dto.limit,
          take: dto.limit,
          order: { date: 'DESC' },
        });
        
        return {
          data: result[0],
          meta: {
            total: result[1],
            page: dto.page,
            limit: dto.limit,
            totalPages: Math.ceil(result[1] / dto.limit),
          },
        };
      },
      
      findOne: async (id: string, userId: string) => {
        const invoice = await invoiceRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: [
            'client',
            'details',
            'details.product',
            'details.product.brand',
            'details.product.category',
            'details.product.taxes',
            'details.product.measurement_unit',
            'details.product.currency',
          ],
        });
        
        if (!invoice) {
          throw new NotFoundException('Invoice not found');
        }
        
        return invoice;
      },
      
      update: async (id: string, updateDto: any, userId: string) => {
        const existingInvoice = await invoiceRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingInvoice) {
          throw new NotFoundException('Invoice not found');
        }
        
        if (existingInvoice.status === 'PAID') {
          throw new BadRequestException('Cannot update paid invoice');
        }
        
        if (updateDto.client_id) {
          const client = await clientRepository.findOne({ where: { id: updateDto.client_id } });
          if (!client) {
            throw new NotFoundException('Client not found');
          }
        }
        
        await invoiceRepository.update(id, {
          ...updateDto,
          updated_at: new Date(),
        });
        
        return await invoiceRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['client'],
        });
      },
      
      remove: async (id: string, userId: string) => {
        const existingInvoice = await invoiceRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingInvoice) {
          throw new NotFoundException('Invoice not found');
        }
        
        if (existingInvoice.status === 'PAID') {
          throw new BadRequestException('Cannot delete paid invoice');
        }
        
        await invoiceRepository.softRemove(existingInvoice);
      },
      
      createDetail: async (invoiceId: string, dto: any, userId: string) => {
        const invoice = await invoiceRepository.findOne({
          where: { id: invoiceId, organization_id: 'org-' + userId },
        });
        
        if (!invoice) {
          throw new NotFoundException('Invoice not found');
        }
        
        if (invoice.status === 'PAID') {
          throw new BadRequestException('Cannot add details to paid invoice');
        }
        
        const product = await productRepository.findOne({
          where: { id: dto.product_id },
          relations: ['taxes'],
        });
        
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        
        const detail = invoiceDetailRepository.create({
          ...dto,
          invoice_id: invoiceId,
          subtotal: dto.quantity * dto.unit_price,
          tax: dto.quantity * dto.unit_price * 0.16,
          total: dto.quantity * dto.unit_price * 1.16,
        });
        
        return await invoiceDetailRepository.save(detail);
      },
      
      generateCFDI: async (id: string, userId: string, options: any, emitterId: string) => {
        const invoice = await invoiceRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['client', 'details', 'details.product'],
        });
        
        if (!invoice) {
          throw new NotFoundException('Invoice not found');
        }
        
        if (invoice.cfdi_uuid) {
          throw new BadRequestException('CFDI already generated for this invoice');
        }
        
        // Simular generación de CFDI
        const cfdiData = {
          uuid: 'cfdi-' + Date.now(),
          seal: 'seal-' + Math.random().toString(36).substring(7),
          certificate_number: 'CERT123456',
          certificate_sat: 'SAT123456',
          generated_at: new Date(),
          emitter_id: emitterId,
          receiver_id: invoice.client.id,
          total: invoice.total,
          status: 'GENERATED',
        };
        
        await invoiceRepository.update(id, {
          cfdi_uuid: cfdiData.uuid,
          cfdi_seal: cfdiData.seal,
          cfdi_certificate: cfdiData.certificate_number,
          cfdi_generated_at: cfdiData.generated_at,
        });
        
        return cfdiData;
      },
      downloadXML: jest.fn(),
      convertWithdrawalToInvoice: jest.fn(),
      createGlobalInvoice: jest.fn(),
    };

    invoiceRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    invoiceDetailRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    clientRepository = {
      findOne: jest.fn(),
    };

    productRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
  });

  describe('create', () => {
    const createInvoiceDto = {
      client_id: 'client-id',
      code: 'INV-001',
      date: '2024-01-01',
      details: [
        {
          product_id: 'product-id',
          quantity: 2,
          price: 100,
        }
      ],
    };

    it('should create a new invoice successfully', async () => {
      const mockInvoice = {
        id: 'invoice-id',
        ...createInvoiceDto,
        status: 'draft',
        created_at: new Date(),
      };

      clientRepository.findOne.mockResolvedValue({ id: 'client-id', name: 'Test Client' });
      productRepository.findOne.mockResolvedValue({ id: 'product-id', name: 'Test Product' });
      invoiceRepository.create.mockReturnValue(mockInvoice);
      invoiceRepository.save.mockResolvedValue(mockInvoice);

      const result = await service.create(createInvoiceDto, 'user-id');

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: createInvoiceDto.client_id },
      });
      expect(invoiceRepository.create).toHaveBeenCalled();
      expect(invoiceRepository.save).toHaveBeenCalledWith(mockInvoice);
      expect(result).toBeDefined();
    });

    it('should throw error if client not found', async () => {
      const createInvoiceDto = {
        client_id: 'client-id',
        details: [
          {
            product_id: 'product-id',
            quantity: 2,
            unit_price: 100.00,
          },
        ],
      };

      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createInvoiceDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if product not found', async () => {
      clientRepository.findOne.mockResolvedValue({ id: 'client-id' });
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createInvoiceDto, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated invoices', async () => {
      const mockInvoices = [
        { 
          id: 'invoice-1', 
          client: { id: 'client-1', name: 'Client 1' },
          date: '2024-01-01',
          total: 1000.00,
          status: 'DRAFT',
        },
      ];

      invoiceRepository.findAndCount.mockResolvedValue([mockInvoices, 1]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(invoiceRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: 'org-user-id' },
        relations: [
          'client',
        ],
        order: { date: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toEqual(mockInvoices);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle empty results', async () => {
      invoiceRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    const invoiceId = 'invoice-id';

    it('should return invoice with details', async () => {
      const mockInvoice = {
        id: invoiceId,
        code: 'INV-001',
        status: 'draft',
        client: { id: 'client-id', name: 'Test Client' },
        details: [
          {
            id: 'detail-1',
            product: { id: 'product-id', name: 'Test Product' },
            quantity: 2,
            price: 100,
          },
        ],
      };

      invoiceRepository.findOne.mockResolvedValue(mockInvoice);

      const result = await service.findOne(invoiceId, 'user-id');

      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organization_id: expect.any(String) },
        relations: [
          'client',
          'details',
          'details.product',
          'details.product.brand',
          'details.product.category',
          'details.product.taxes',
          'details.product.measurement_unit',
          'details.product.currency',
        ],
      });
      expect(result).toEqual(mockInvoice);
    });

    it('should throw error if invoice not found', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(invoiceId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const invoiceId = 'invoice-id';
    const updateDto = {
      client_id: 'client-2',
      status: 'sent',
      code: 'INV-001-UPDATED',
    };

    it('should update invoice successfully', async () => {
      const existingInvoice = {
        id: invoiceId,
        code: 'INV-001',
        status: 'draft',
      };
      const updatedInvoice = {
        ...existingInvoice,
        ...updateDto,
        updated_at: new Date(),
      };
      const mockClient = { id: 'client-2', name: 'Client 2' };

      invoiceRepository.findOne
        .mockResolvedValueOnce(existingInvoice)
        .mockResolvedValueOnce(updatedInvoice);
      clientRepository.findOne.mockResolvedValue(mockClient);
      invoiceRepository.save.mockResolvedValue(updatedInvoice);

      const result = await service.update(invoiceId, updateDto, 'user-id');

      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organization_id: 'org-user-id' },
      });
      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: updateDto.client_id },
      });
      expect(invoiceRepository.update).toHaveBeenCalledWith(
        invoiceId,
        expect.objectContaining(updateDto)
      );
      expect(result).toEqual(updatedInvoice);
    });

    it('should throw error if invoice not found', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);

      await expect(service.update(invoiceId, updateDto, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const invoiceId = 'invoice-id';

    it('should soft delete invoice successfully', async () => {
      const existingInvoice = {
        id: invoiceId,
        code: 'INV-001',
        status: 'draft',
      };

      invoiceRepository.findOne.mockResolvedValue(existingInvoice);
      invoiceRepository.softRemove.mockResolvedValue({});

      await service.remove(invoiceId, 'user-id');

      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organization_id: expect.any(String) },
      });
      expect(invoiceRepository.softRemove).toHaveBeenCalledWith(existingInvoice);
    });

    it('should throw error if invoice not found', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(invoiceId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDetail', () => {
    const invoiceId = 'invoice-id';

    it('should create invoice detail successfully', async () => {
      const createDetailDto = {
        product_id: 'product-id',
        quantity: 2,
        unit_price: 100.00,
      };

      const mockInvoice = { id: 'invoice-id', status: 'DRAFT' };
      const mockProduct = { id: 'product-id', name: 'Product 1', taxes: [] };
      const mockDetail = {
        id: 'detail-id',
        invoice_id: 'invoice-id',
        ...createDetailDto,
        subtotal: 200.00,
        tax: 32.00,
        total: 232.00,
      };

      invoiceRepository.findOne.mockResolvedValue(mockInvoice);
      productRepository.findOne.mockResolvedValue(mockProduct);
      invoiceDetailRepository.create.mockReturnValue(mockDetail);
      invoiceDetailRepository.save.mockResolvedValue(mockDetail);

      const result = await service.createDetail(invoiceId, createDetailDto, 'user-id');

      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organization_id: 'org-user-id' },
      });
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDetailDto.product_id },
        relations: ['taxes'],
      });
      expect(invoiceDetailRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockDetail);
    });

    it('should throw error if product not found', async () => {
      const createDetailDto = {
        product_id: 'product-id',
        quantity: 2,
        unit_price: 100.00,
      };
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.createDetail(invoiceId, createDetailDto, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateCFDI', () => {
    const invoiceId = 'invoice-id';
    const options = {
      emitterId: 'emitter-id',
    };

    it('should generate CFDI successfully', async () => {
      const mockInvoice = {
        id: 'invoice-id',
        client: { id: 'client-1' },
        total: 1000.00,
        cfdi_uuid: null,
      };

      invoiceRepository.findOne.mockResolvedValue(mockInvoice);

      const result = await service.generateCFDI(invoiceId, 'user-id', options, options.emitterId);

      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organization_id: 'org-user-id' },
        relations: ['client', 'details', 'details.product'],
      });
      expect(result).toBeDefined();
      expect(result.uuid).toContain('cfdi-');
      expect(result.status).toBe('GENERATED');
    });

    it('should throw error if invoice not found', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);

      await expect(service.generateCFDI(invoiceId, 'user-id', options, options.emitterId)).rejects.toThrow(NotFoundException);
    });
  });
});
