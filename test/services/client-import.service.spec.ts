import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ClientImportService, ImportClientRow, ClientImportResult } from '../../src/services/client-import.service';
import { Client } from '../../src/models/client.entity';
import { ClientAddress, AddressType } from '../../src/models/client-address.entity';
import { ClientTaxData } from '../../src/models/client-tax-data.entity';
import { TenantContext } from '../../src/services/tenant-context.service';
import { ClientPackSyncService } from '../../src/services/client-pack-sync.service';

describe('ClientImportService', () => {
  let service: ClientImportService;
  let clientRepo: jest.Mocked<Repository<Client>>;
  let addressRepo: jest.Mocked<Repository<ClientAddress>>;
  let taxDataRepo: jest.Mocked<Repository<ClientTaxData>>;
  let tenantContext: jest.Mocked<TenantContext>;
  let clientPackSyncService: jest.Mocked<ClientPackSyncService>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repositories
    clientRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;

    addressRepo = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    taxDataRepo = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    // Mock services
    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    } as any;

    clientPackSyncService = {
      syncOnCreate: jest.fn(),
    } as any;

    // Create service instance
    service = new ClientImportService(
      clientRepo,
      addressRepo,
      taxDataRepo,
      tenantContext,
      clientPackSyncService,
    );
  });

  describe('parseCSV', () => {
    it('should parse CSV with comma separator', () => {
      const csvContent = 'code,name,email,phone\nCLI001,Test Client,test@example.com,555-1234\nCLI002,Another Client,another@example.com,555-5678';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        row: 2,
        code: 'CLI001',
        name: 'Test Client',
        email: 'test@example.com',
        phone: '555-1234',
        description: '',
        status: 'true',
        tax_document: '',
        tax_name: '',
        tax_system: '',
        invoice_use: '',
        address_zip: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_country: '',
      });
      expect(result[1]).toEqual({
        row: 3,
        code: 'CLI002',
        name: 'Another Client',
        email: 'another@example.com',
        phone: '555-5678',
        description: '',
        status: 'true',
        tax_document: '',
        tax_name: '',
        tax_system: '',
        invoice_use: '',
        address_zip: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_country: '',
      });
    });

    it('should parse CSV with semicolon separator', () => {
      const csvContent = 'code;name;email;phone\nCLI001;Test Client;test@example.com;555-1234';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        code: 'CLI001',
        name: 'Test Client',
        email: 'test@example.com',
        phone: '555-1234',
        description: '',
        status: 'true',
        tax_document: '',
        tax_name: '',
        tax_system: '',
        invoice_use: '',
        address_zip: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_country: '',
      });
    });

    it('should handle quoted fields', () => {
      const csvContent = 'code,name,description\nCLI001,"Client, Inc.","Test client with comma in name"';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        code: 'CLI001',
        name: 'Client, Inc.',
        description: 'Test client with comma in name',
        email: '',
        phone: '',
        status: 'true',
        tax_document: '',
        tax_name: '',
        tax_system: '',
        invoice_use: '',
        address_zip: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_country: '',
      });
    });

    it('should map Spanish headers correctly', () => {
      const csvContent = 'codigo,nombre,correo,telefono\nCLI001,Cliente Test,test@example.com,555-1234';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        code: 'CLI001',
        name: 'Cliente Test',
        email: 'test@example.com',
        phone: '555-1234',
        description: '',
        status: 'true',
        tax_document: '',
        tax_name: '',
        tax_system: '',
        invoice_use: '',
        address_zip: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_country: '',
      });
    });

    it('should include tax and address fields', () => {
      const csvContent = 'code,name,tax_document,tax_name,address_zip,address_street\nCLI001,Test Client,TAX123,Test Tax,12345,Main St';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 2,
        code: 'CLI001',
        name: 'Test Client',
        tax_document: 'TAX123',
        tax_name: 'Test Tax',
        address_zip: '12345',
        address_street: 'Main St',
        description: '',
        email: '',
        phone: '',
        status: 'true',
        tax_system: '',
        invoice_use: '',
        address_city: '',
        address_state: '',
        address_country: '',
      });
    });

    it('should skip metadata rows', () => {
      const csvContent = 'code,name\ntipo:campo\nCLI001,Test Client';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        row: 3,
        code: 'CLI001',
        name: 'Test Client',
        description: '',
        email: '',
        phone: '',
        status: 'true',
        tax_document: '',
        tax_name: '',
        tax_system: '',
        invoice_use: '',
        address_zip: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_country: '',
      });
    });

    it('should throw error for empty or insufficient data', () => {
      const emptyBuffer = Buffer.from('', 'utf-8');
      const headerOnlyBuffer = Buffer.from('code,name\n', 'utf-8');

      expect(() => service.parseCSV(emptyBuffer)).toThrow(BadRequestException);
      expect(() => service.parseCSV(headerOnlyBuffer)).toThrow(BadRequestException);
    });

    it('should handle different line endings', () => {
      const csvContent = 'code,name\r\nCLI001,Test Client\r\nCLI002,Another Client';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(2);
    });
  });

  describe('importRows', () => {
    const mockClient = {
      id: 'client-1',
      code: 'CLI001',
      name: 'Test Client',
      email: 'test@example.com',
    };

    const mockClientWithRelations = {
      id: 'client-1',
      code: 'CLI001',
      name: 'Test Client',
      email: 'test@example.com',
      addresses: [],
      taxData: [],
    };

    it('should import valid rows successfully', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
          email: 'test@example.com',
          status: 'true',
        },
      ];

      clientRepo.findOne.mockResolvedValue(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);

      const result = await service.importRows(rows);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.skipped).toBe(0);
      expect(result.summary).toContain('1 creados');
      expect(clientRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CLI001',
          name: 'Test Client',
          email: 'test@example.com',
          status: true,
          organization_id: 'org-123',
        })
      );
    });

    it('should handle invalid email format', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
          email: 'invalid-email',
          status: 'true',
        },
      ];

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        row: 1,
        code: 'CLI001',
        name: 'Test Client',
        reason: 'El email "invalid-email" no tiene un formato válido',
      });
    });

    it('should handle missing required fields', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: '',
          name: 'Test Client',
        },
        {
          row: 2,
          code: 'CLI002',
          name: '',
        },
      ];

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].reason).toContain('El campo "code" es requerido');
      expect(result.errors[1].reason).toContain('El campo "name" es requerido');
    });

    it('should handle field length validation', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'AB', // Too short
          name: 'Test Client',
        },
        {
          row: 2,
          code: 'CLI003',
          name: 'A', // Too short
        },
        {
          row: 3,
          code: 'A'.repeat(51), // Too long
          name: 'Test Client',
        },
        {
          row: 4,
          code: 'CLI004',
          name: 'A'.repeat(101), // Too long
        },
      ];

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(4);
      expect(result.errors[0].reason).toContain('entre 3 y 50 caracteres');
      expect(result.errors[1].reason).toContain('entre 3 y 100 caracteres');
      expect(result.errors[2].reason).toContain('entre 3 y 50 caracteres');
      expect(result.errors[3].reason).toContain('entre 3 y 100 caracteres');
    });

    it('should skip duplicate codes', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
        },
      ];

      clientRepo.findOne.mockResolvedValue(mockClient as any);

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('ya existe — omitido para evitar duplicado');
    });

    it('should create tax data when provided', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
          tax_document: 'TAX123',
          tax_name: 'Tax Name',
          tax_system: '601',
          invoice_use: 'G03',
        },
      ];

      clientRepo.findOne.mockResolvedValue(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);
      taxDataRepo.create.mockReturnValue({} as any);
      taxDataRepo.save.mockResolvedValue({} as any);

      const result = await service.importRows(rows);

      expect(result.created).toBe(1);
      expect(taxDataRepo.create).toHaveBeenCalledWith({
        client_id: 'client-1',
        tax_document: 'TAX123',
        tax_name: 'Tax Name',
        tax_system: '601',
        default_invoice_use: 'G03',
        is_main: true,
      });
      expect(taxDataRepo.save).toHaveBeenCalled();
    });

    it('should create address when provided', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
          address_zip: '12345',
          address_street: 'Main St',
          address_city: 'Test City',
          address_state: 'Test State',
          address_country: 'USA',
        },
      ];

      clientRepo.findOne.mockResolvedValue(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);
      addressRepo.create.mockReturnValue({} as any);
      addressRepo.save.mockResolvedValue({} as any);

      const result = await service.importRows(rows);

      expect(result.created).toBe(1);
      expect(addressRepo.create).toHaveBeenCalledWith({
        client_id: 'client-1',
        type: AddressType.BILLING,
        zip_code: '12345',
        street: 'Main St',
        city: 'Test City',
        state: 'Test State',
        country: 'USA',
        is_main: true,
      });
      expect(addressRepo.save).toHaveBeenCalled();
    });

    it('should default country to MEX when not provided', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
          address_zip: '12345',
        },
      ];

      clientRepo.findOne.mockResolvedValue(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);
      addressRepo.create.mockReturnValue({} as any);
      addressRepo.save.mockResolvedValue({} as any);

      await service.importRows(rows);

      expect(addressRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'MEX',
        })
      );
    });

    it('should parse status correctly', async () => {
      const testCases = [
        { status: 'true', expected: true },
        { status: 'false', expected: false },
        { status: '1', expected: true },
        { status: '0', expected: false },
        { status: 'inactivo', expected: false },
        { status: 'inactive', expected: false },
        { status: 'active', expected: true },
        { status: undefined, expected: true }, // Default
      ];

      for (const testCase of testCases) {
        const rows: ImportClientRow[] = [
          {
            row: 1,
            code: 'CLI001',
            name: 'Test Client',
            status: testCase.status,
          },
        ];

        clientRepo.findOne.mockResolvedValue(null);
        clientRepo.create.mockReturnValue(mockClient as any);
        clientRepo.save.mockResolvedValue(mockClient as any);

        await service.importRows(rows);

        expect(clientRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            status: testCase.expected,
          })
        );
      }
    });

    it('should sync with pack when tax and address are provided', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
          tax_document: 'TAX123',
          address_zip: '12345',
        },
      ];

      // First call - check for existing client
      clientRepo.findOne.mockResolvedValueOnce(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);
      // Second call - get client with relations for sync
      clientRepo.findOne.mockResolvedValueOnce(mockClientWithRelations as any);
      
      const mockSyncResult = {
        client: mockClientWithRelations as any,
        packSyncSuccess: true,
        packErrorMessage: undefined,
      };
      clientPackSyncService.syncOnCreate.mockResolvedValue(mockSyncResult);

      const result = await service.importRows(rows);

      expect(result.pack_synced).toBe(1);
      expect(result.pack_failed).toBe(0);
      expect(clientPackSyncService.syncOnCreate).toHaveBeenCalledWith(mockClientWithRelations);
    });

    it('should handle pack sync failures', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
          tax_document: 'TAX123',
          address_zip: '12345',
        },
      ];

      // First call - check for existing client
      clientRepo.findOne.mockResolvedValueOnce(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);
      // Second call - get client with relations for sync
      clientRepo.findOne.mockResolvedValueOnce(mockClientWithRelations as any);
      
      const mockSyncResult = {
        client: mockClientWithRelations as any,
        packSyncSuccess: false,
        packErrorMessage: 'Pack sync error',
      };
      clientPackSyncService.syncOnCreate.mockResolvedValue(mockSyncResult);

      const result = await service.importRows(rows);

      expect(result.pack_synced).toBe(0);
      expect(result.pack_failed).toBe(1);
      expect(result.pack_warnings).toHaveLength(1);
      expect(result.pack_warnings[0]).toEqual({
        code: 'CLI001',
        name: 'Test Client',
        reason: 'Pack sync error',
      });
    });

    it('should handle pack sync exceptions', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
          tax_document: 'TAX123',
          address_zip: '12345',
        },
      ];

      // First call - check for existing client
      clientRepo.findOne.mockResolvedValueOnce(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);
      // Second call - get client with relations for sync
      clientRepo.findOne.mockResolvedValueOnce(mockClientWithRelations as any);
      
      clientPackSyncService.syncOnCreate.mockRejectedValue(new Error('Sync error'));

      const result = await service.importRows(rows);

      expect(result.pack_synced).toBe(0);
      expect(result.pack_failed).toBe(1);
      expect(result.pack_warnings).toHaveLength(1);
      expect(result.pack_warnings[0].reason).toContain('Sync error');
    });

    it('should handle database errors gracefully', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
        },
      ];

      clientRepo.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.importRows(rows);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        row: 1,
        code: 'CLI001',
        name: 'Test Client',
        reason: 'Database error',
      });
    });

    it('should use override organization ID when provided', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
        },
      ];

      clientRepo.findOne.mockResolvedValue(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);

      await service.importRows(rows, 'override-org-456');

      expect(clientRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'override-org-456',
        })
      );
    });

    it('should generate comprehensive summary', async () => {
      const rows: ImportClientRow[] = [
        {
          row: 1,
          code: 'CLI001',
          name: 'Test Client',
        },
        {
          row: 2,
          code: 'CLI002', // Will be skipped as duplicate
          name: 'Test Client 2',
        },
      ];

      // First row - success
      clientRepo.findOne.mockResolvedValueOnce(null);
      clientRepo.create.mockReturnValue(mockClient as any);
      clientRepo.save.mockResolvedValue(mockClient as any);

      // Second row - duplicate
      clientRepo.findOne.mockResolvedValueOnce({
        id: 'existing-client',
        code: 'CLI002',
        name: 'Test Client 2',
      } as any);

      const result = await service.importRows(rows);

      expect(result.summary).toBe(
        'Importación completada: 1 creados, 1 omitidos (duplicados), 1 errores. Pack: 0 sincronizados, 0 fallidos.'
      );
    });
  });

  describe('organizationId getter', () => {
    it('should return organization ID from tenant context', () => {
      const orgId = (service as any).organizationId;
      expect(orgId).toBe('org-123');
      expect(tenantContext.getOrganizationId).toHaveBeenCalled();
    });
  });
});
