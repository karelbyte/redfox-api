import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { ClientPackSyncService } from '../../src/services/client-pack-sync.service';
import { Client } from '../../src/models/client.entity';
import { ClientAddress, AddressType } from '../../src/models/client-address.entity';
import { ClientTaxData } from '../../src/models/client-tax-data.entity';
import { CertificationPackFactoryService } from '../../src/services/certification-pack-factory.service';
import { ICertificationPackService } from '../../src/interfaces/certification-pack.interface';
import { UpdateClientDto } from '../../src/dtos/client/update-client.dto';

describe('ClientPackSyncService', () => {
  let service: ClientPackSyncService;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let certificationPackFactory: jest.Mocked<CertificationPackFactoryService>;
  let packService: jest.Mocked<ICertificationPackService>;
  let logger: jest.Mocked<Logger>;

  const mockClient = {
    id: 'client-1',
    name: 'Test Client',
    email: 'test@example.com',
    phone: '555-1234',
    pack_client_id: null,
    pack_client_response: null,
    taxData: [],
    addresses: [],
    organization_id: 'org-123',
    code: 'CLIENT001',
    description: 'Test client description',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as any;

  const mockClientWithTaxAndAddress = {
    id: 'client-2',
    name: 'Client with Tax and Address',
    email: 'client@example.com',
    phone: '555-5678',
    pack_client_id: null,
    pack_client_response: null,
    taxData: [
      {
        id: 'tax-1',
        tax_document: 'TAX123456',
        tax_name: 'Legal Name',
        tax_system: '601',
        default_invoice_use: 'G03',
        is_main: true,
      },
    ],
    addresses: [
      {
        id: 'addr-1',
        type: AddressType.BILLING,
        street: 'Main St',
        exterior_number: '123',
        interior_number: 'Apt 4B',
        neighborhood: 'Downtown',
        city: 'Test City',
        municipality: 'Test Municipality',
        zip_code: '12345',
        state: 'Test State',
        country: 'MEX',
        is_main: true,
      },
    ],
    organization_id: 'org-123',
    code: 'CLIENT002',
    description: 'Client with tax and address',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as any;

  const mockPackResponse = {
    id: 'pack-customer-123',
    uuid: 'uuid-123',
    status: 'active',
    created_at: new Date(),
    livemode: false,
    legal_name: 'Test Legal Name',
    tax_id: 'TAX123',
  } as any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repository
    clientRepository = {
      save: jest.fn(),
    } as any;

    // Mock pack service
    packService = {
      createCustomer: jest.fn(),
      updateCustomer: jest.fn(),
    } as any;

    // Mock factory
    certificationPackFactory = {
      getPackService: jest.fn().mockResolvedValue(packService),
    } as any;

    // Mock logger
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // Create service instance
    service = new ClientPackSyncService(
      clientRepository,
      certificationPackFactory,
    );

    // Override logger
    (service as any).logger = logger;
  });

  describe('extractCustomerData', () => {
    it('should extract customer data from client with tax and address', () => {
      const data = (service as any).extractCustomerData(mockClientWithTaxAndAddress);

      expect(data).toEqual({
        legal_name: 'Legal Name',
        tax_id: 'TAX123456',
        tax_system: '601',
        email: 'client@example.com',
        phone: '555-5678',
        default_invoice_use: 'G03',
        address: {
          street: 'Main St',
          exterior: '123',
          interior: 'Apt 4B',
          neighborhood: 'Downtown',
          city: 'Test City',
          municipality: 'Test Municipality',
          zip: '12345',
          state: 'Test State',
          country: 'MEX',
        },
      });

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[extractCustomerData] client.id=client-2'),
      );
    });

    it('should handle client without tax data', () => {
      const clientWithoutTax = {
        ...mockClient,
        taxData: [],
        addresses: [],
      };

      const data = (service as any).extractCustomerData(clientWithoutTax);

      expect(data).toEqual({
        legal_name: 'Test Client',
        tax_id: 'XAXX010101000',
        tax_system: undefined,
        email: 'test@example.com',
        phone: '555-1234',
        default_invoice_use: undefined,
        address: undefined,
      });
    });

    it('should handle client without address', () => {
      const clientWithoutAddress = {
        ...mockClientWithTaxAndAddress,
        addresses: [],
      };

      const data = (service as any).extractCustomerData(clientWithoutAddress);

      expect(data.address).toBeUndefined();
      expect(data.legal_name).toBe('Legal Name');
      expect(data.tax_id).toBe('TAX123456');
    });

    it('should use non-main tax data if main is not available', () => {
      const clientWithNonMainTax = {
        ...mockClient,
        taxData: [
          {
            id: 'tax-1',
            tax_document: 'TAX123',
            tax_name: 'Tax Name 1',
            is_main: false,
          },
          {
            id: 'tax-2',
            tax_document: 'TAX456',
            tax_name: 'Tax Name 2',
            is_main: false,
          },
        ],
      };

      const data = (service as any).extractCustomerData(clientWithNonMainTax);

      expect(data.legal_name).toBe('Tax Name 1');
      expect(data.tax_id).toBe('TAX123');
    });

    it('should use non-main address if main is not available', () => {
      const clientWithNonMainAddress = {
        ...mockClient,
        addresses: [
          {
            id: 'addr-1',
            street: 'Street 1',
            zip_code: '12345',
            is_main: false,
          },
          {
            id: 'addr-2',
            street: 'Street 2',
            zip_code: '67890',
            is_main: false,
          },
        ],
      };

      const data = (service as any).extractCustomerData(clientWithNonMainAddress);

      expect(data.address?.street).toBe('Street 1');
      expect(data.address?.zip).toBe('12345');
    });

    it('should handle missing optional address fields', () => {
      const clientWithPartialAddress = {
        ...mockClient,
        addresses: [
          {
            id: 'addr-1',
            street: 'Main St',
            zip_code: '12345',
            is_main: true,
          },
        ],
      };

      const data = (service as any).extractCustomerData(clientWithPartialAddress);

      expect(data.address).toEqual({
        street: 'Main St',
        exterior: undefined,
        interior: undefined,
        neighborhood: undefined,
        city: undefined,
        municipality: undefined,
        zip: '12345',
        state: undefined,
        country: undefined,
      });
    });
  });

  describe('syncOnCreate', () => {
    it('should sync client on create successfully', async () => {
      packService.createCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue({
        ...mockClient,
        pack_client_id: mockPackResponse.id,
        pack_client_response: mockPackResponse,
      });

      const result = await service.syncOnCreate(mockClient);

      expect(result.packSyncSuccess).toBe(true);
      expect(result.client.pack_client_id).toBe(mockPackResponse.id);
      expect(result.client.pack_client_response).toEqual(mockPackResponse);
      expect(packService.createCustomer).toHaveBeenCalled();
      expect(clientRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_client_id: mockPackResponse.id,
          pack_client_response: mockPackResponse,
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnCreate] SUCCESS'),
      );
    });

    it('should handle sync on create failure', async () => {
      const errorMessage = 'Pack service error';
      packService.createCustomer.mockRejectedValue(new Error(errorMessage));

      const result = await service.syncOnCreate(mockClient);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe(errorMessage);
      expect(result.client).toEqual(mockClient);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnCreate] FAILED'),
      );
    });

    it('should log sync process correctly', async () => {
      packService.createCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue(mockClient as any);

      await service.syncOnCreate(mockClient);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnCreate] START'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnCreate] Calling createCustomer'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnCreate] createCustomer RESPONSE'),
      );
    });
  });

  describe('syncOnUpdate', () => {
    const mockUpdateDto: UpdateClientDto = {
      name: 'Updated Client',
      email: 'updated@example.com',
    };

    it('should create customer if pack_client_id does not exist', async () => {
      const clientWithoutPackId = { ...mockClient, pack_client_id: null };
      
      packService.createCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue({
        ...clientWithoutPackId,
        pack_client_id: mockPackResponse.id,
        pack_client_response: mockPackResponse,
      });

      const result = await service.syncOnUpdate(clientWithoutPackId, mockUpdateDto);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createCustomer).toHaveBeenCalled();
      expect(packService.updateCustomer).not.toHaveBeenCalled();
      expect(clientRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_client_id: mockPackResponse.id,
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnUpdate] SUCCESS (create)'),
      );
    });

    it('should update customer if pack_client_id exists', async () => {
      const clientWithPackId = { ...mockClient, pack_client_id: 'existing-pack-id' };
      
      packService.updateCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue({
        ...clientWithPackId,
        pack_client_response: mockPackResponse,
      });

      const result = await service.syncOnUpdate(clientWithPackId, mockUpdateDto);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.updateCustomer).toHaveBeenCalledWith('existing-pack-id', expect.any(Object));
      expect(packService.createCustomer).not.toHaveBeenCalled();
      expect(clientRepository.save).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnUpdate] SUCCESS (update)'),
      );
    });

    it('should handle sync on update failure', async () => {
      jest.clearAllMocks(); // Clear previous mocks
      const errorMessage = 'Update failed';
      const cleanClient = { ...mockClient, pack_client_id: null, pack_client_response: null };
      packService.createCustomer.mockRejectedValue(new Error(errorMessage));
      certificationPackFactory.getPackService.mockResolvedValue(packService);

      const result = await service.syncOnUpdate(cleanClient, mockUpdateDto);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe(errorMessage);
      expect(result.client).toEqual(cleanClient);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnUpdate] FAILED'),
      );
    });

    it('should log update process correctly', async () => {
      jest.clearAllMocks(); // Clear previous mocks
      const cleanClient = { ...mockClient, pack_client_id: null, pack_client_response: null };
      packService.createCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue(mockClient as any);
      certificationPackFactory.getPackService.mockResolvedValue(packService);

      await service.syncOnUpdate(cleanClient, mockUpdateDto);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnUpdate] START'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncOnUpdate] No pack_client_id'),
      );
    });
  });

  describe('syncManually', () => {
    it('should update customer if pack_client_id exists', async () => {
      const clientWithPackId = { ...mockClient, pack_client_id: 'existing-pack-id' };
      
      packService.updateCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue({
        ...clientWithPackId,
        pack_client_response: mockPackResponse,
      });

      const result = await service.syncManually(clientWithPackId);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.updateCustomer).toHaveBeenCalledWith('existing-pack-id', expect.any(Object));
      expect(packService.createCustomer).not.toHaveBeenCalled();
      expect(clientRepository.save).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncManually] SUCCESS (update)'),
      );
    });

    it('should create customer if pack_client_id does not exist', async () => {
      const clientWithoutPackId = { ...mockClient, pack_client_id: null };
      
      packService.createCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue({
        ...clientWithoutPackId,
        pack_client_id: mockPackResponse.id,
        pack_client_response: mockPackResponse,
      });

      const result = await service.syncManually(clientWithoutPackId);

      expect(result.packSyncSuccess).toBe(true);
      expect(packService.createCustomer).toHaveBeenCalled();
      expect(packService.updateCustomer).not.toHaveBeenCalled();
      expect(clientRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_client_id: mockPackResponse.id,
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncManually] SUCCESS (create)'),
      );
    });

    it('should handle manual sync failure', async () => {
      const errorMessage = 'Manual sync failed';
      packService.updateCustomer.mockRejectedValue(new Error(errorMessage));

      const result = await service.syncManually({ ...mockClient, pack_client_id: 'existing-id' });

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe(errorMessage);
      expect(result.client).toEqual({ ...mockClient, pack_client_id: 'existing-id' });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[syncManually] FAILED'),
      );
    });

    it('should log manual sync process correctly', async () => {
      packService.updateCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue(mockClient as any);

      await service.syncManually({ ...mockClient, pack_client_id: 'test-id' });

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncManually] START'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncManually] Calling updateCustomer'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncManually] updateCustomer RESPONSE'),
      );
    });

    it('should log create process when no pack_client_id', async () => {
      jest.clearAllMocks(); // Clear previous mocks
      const cleanClient = { ...mockClient, pack_client_id: null, pack_client_response: null };
      packService.createCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockResolvedValue(mockClient as any);
      certificationPackFactory.getPackService.mockResolvedValue(packService);

      await service.syncManually(cleanClient);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncManually] Calling createCustomer'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[syncManually] createCustomer RESPONSE'),
      );
    });
  });

  describe('error handling', () => {
    it('should handle factory service errors', async () => {
      const errorMessage = 'Factory error';
      certificationPackFactory.getPackService.mockRejectedValue(new Error(errorMessage));

      const result = await service.syncOnCreate(mockClient);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe(errorMessage);
    });

    it('should handle repository save errors', async () => {
      packService.createCustomer.mockResolvedValue(mockPackResponse);
      clientRepository.save.mockRejectedValue(new Error('Save failed'));

      const result = await service.syncOnCreate(mockClient);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe('Save failed');
    });

    it('should handle null error message', async () => {
      packService.createCustomer.mockRejectedValue(new Error());

      const result = await service.syncOnCreate(mockClient);

      expect(result.packSyncSuccess).toBe(false);
      expect(result.packErrorMessage).toBe('');
    });
  });

  describe('logging', () => {
    it('should log extraction process with correct data', () => {
      (service as any).extractCustomerData(mockClientWithTaxAndAddress);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[extractCustomerData] client.id=client-2'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('taxData count=1'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('addresses count=1'),
      );
    });

    it('should log extraction process with zero counts', () => {
      (service as any).extractCustomerData(mockClient);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('taxData count=0'),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('addresses count=0'),
      );
    });

    it('should log extracted customer data', () => {
      (service as any).extractCustomerData(mockClientWithTaxAndAddress);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[extractCustomerData] → CustomerData'),
      );
    });
  });
});
