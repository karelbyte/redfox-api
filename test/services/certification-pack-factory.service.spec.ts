import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Logger } from '@nestjs/common';
import { CertificationPackFactoryService } from '../../src/services/certification-pack-factory.service';
import { CertificationPack } from '../../src/models/certification-pack.entity';
import { CertificationPackType } from '../../src/constants/certification-packs.constant';
import { ICertificationPackService } from '../../src/interfaces/certification-pack.interface';
import { FacturaAPIService } from '../../src/services/facturapi.service';
import { FacturaGreenService } from '../../src/services/factura-green.service';
import { TenantContext } from '../../src/services/tenant-context.service';

describe('CertificationPackFactoryService', () => {
  let service: CertificationPackFactoryService;
  let certificationPackRepository: jest.Mocked<Repository<CertificationPack>>;
  let facturaAPIService: jest.Mocked<ICertificationPackService>;
  let facturaGreenService: jest.Mocked<ICertificationPackService>;
  let tenantContext: jest.Mocked<TenantContext>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repository
    certificationPackRepository = {
      findOne: jest.fn(),
    } as any;

    // Mock services
    facturaAPIService = {
      generateCFDI: jest.fn(),
      cancelCFDI: jest.fn(),
      getCFDIStatus: jest.fn(),
      downloadPDF: jest.fn(),
      downloadXML: jest.fn(),
      validateTaxId: jest.fn(),
      getTaxRegimes: jest.fn(),
      getProductKeys: jest.fn(),
      getPaymentForms: jest.fn(),
      getUses: jest.fn(),
      searchMeasurementUnits: jest.fn(),
      searchProductKeys: jest.fn(),
      createCustomer: jest.fn(),
      updateCustomer: jest.fn(),
      listCustomers: jest.fn(),
      deleteCustomer: jest.fn(),
      createProduct: jest.fn(),
      findProductBySku: jest.fn(),
    } as any;

    facturaGreenService = {
      generateCFDI: jest.fn(),
      cancelCFDI: jest.fn(),
      getCFDIStatus: jest.fn(),
      downloadPDF: jest.fn(),
      downloadXML: jest.fn(),
      validateTaxId: jest.fn(),
      getTaxRegimes: jest.fn(),
      getProductKeys: jest.fn(),
      getPaymentForms: jest.fn(),
      getUses: jest.fn(),
      searchMeasurementUnits: jest.fn(),
      searchProductKeys: jest.fn(),
      createCustomer: jest.fn(),
      updateCustomer: jest.fn(),
      findCustomerByUUID: jest.fn(),
      searchCustomerByRFC: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      generatePaymentComplement: jest.fn(),
      cancelPaymentComplement: jest.fn(),
      generateGlobalInvoice: jest.fn(),
      cancelGlobalInvoice: jest.fn(),
    } as any;

    // Mock tenant context
    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
      setPacConfig: jest.fn(),
    } as any;

    // Mock logger
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // Create service instance
    service = new CertificationPackFactoryService(
      certificationPackRepository,
      facturaAPIService,
      facturaGreenService,
      tenantContext,
    );

    // Override logger
    (service as any).logger = logger;
  });

  describe('initializePackServices', () => {
    it('should initialize pack services correctly', () => {
      const packServices = (service as any).packServices;
      
      expect(packServices.get(CertificationPackType.FACTURAAPI)).toBe(facturaAPIService);
      expect(packServices.get(CertificationPackType.FACTURA_GREEN)).toBe(facturaGreenService);
    });
  });

  describe('getActivePack', () => {
    it('should return default active pack', async () => {
      const mockPack = {
        id: 'pack-1',
        type: CertificationPackType.FACTURAAPI,
        is_default: true,
        is_active: true,
      };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);

      const result = await service.getActivePack();

      expect(result).toEqual(mockPack);
      expect(certificationPackRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_default: true,
          is_active: true,
          organization_id: 'org-123',
        },
        relations: ['emitters'],
      });
    });

    it('should return first active pack when no default pack', async () => {
      const mockPack = {
        id: 'pack-2',
        type: CertificationPackType.FACTURA_GREEN,
        is_default: false,
        is_active: true,
      };

      certificationPackRepository.findOne
        .mockResolvedValueOnce(null) // No default pack
        .mockResolvedValueOnce(mockPack as any); // First active pack

      const result = await service.getActivePack();

      expect(result).toEqual(mockPack);
      expect(certificationPackRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when no active packs found', async () => {
      certificationPackRepository.findOne.mockResolvedValue(null);

      await expect(service.getActivePack()).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPackService', () => {
    it('should return service for specified pack type', async () => {
      const mockPack = {
        id: 'pack-1',
        type: CertificationPackType.FACTURAAPI,
        is_active: true,
        config: { api_key: 'test-key' },
      };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);

      const result = await service.getPackService(CertificationPackType.FACTURAAPI);

      expect(result).toBe(facturaAPIService);
      expect(tenantContext.setPacConfig).toHaveBeenCalledWith({ api_key: 'test-key' });
      expect(certificationPackRepository.findOne).toHaveBeenCalledWith({
        where: {
          type: CertificationPackType.FACTURAAPI,
          is_active: true,
          organization_id: 'org-123',
        },
        relations: ['emitters'],
      });
    });

    it('should return service for active pack when no type specified', async () => {
      const mockPack = {
        id: 'pack-2',
        type: CertificationPackType.FACTURA_GREEN,
        is_active: true,
        config: { business_uuid: 'test-business' },
      };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);

      const result = await service.getPackService();

      expect(result).toBe(facturaGreenService);
      expect(tenantContext.setPacConfig).toHaveBeenCalledWith({ business_uuid: 'test-business' });
    });

    it('should throw NotFoundException when pack not found for specified type', async () => {
      certificationPackRepository.findOne.mockResolvedValue(null);

      await expect(service.getPackService(CertificationPackType.FACTURAAPI)).rejects.toThrow(NotFoundException);
      expect(logger.warn).toHaveBeenCalledWith('Certification pack FACTURAAPI not found for organization org-123');
    });

    it('should throw NotFoundException when no active pack found', async () => {
      // Mock getActivePack to throw error
      jest.spyOn(service, 'getActivePack').mockRejectedValue(new NotFoundException('No active certification pack found'));

      await expect(service.getPackService()).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when service not implemented for pack type', async () => {
      const mockPack = {
        id: 'pack-1',
        type: 'UNSUPPORTED_TYPE' as CertificationPackType,
        is_active: true,
      };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);

      await expect(service.getPackService('UNSUPPORTED_TYPE' as CertificationPackType)).rejects.toThrow(NotFoundException);
      expect(logger.error).toHaveBeenCalledWith('Service for pack type UNSUPPORTED_TYPE not implemented');
    });

    it('should log successful service selection', async () => {
      const mockPack = {
        id: 'pack-1',
        type: CertificationPackType.FACTURAAPI,
        is_active: true,
      };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);

      await service.getPackService(CertificationPackType.FACTURAAPI);

      expect(logger.log).toHaveBeenCalledWith('Selected certification pack: FACTURAAPI (id=pack-1) for organization org-123');
    });
  });

  describe('registerPackService', () => {
    it('should register new pack service', () => {
      const mockService = {
        generateCFDI: jest.fn(),
      } as ICertificationPackService;

      service.registerPackService(CertificationPackType.FACTURAAPI, mockService);

      const packServices = (service as any).packServices;
      expect(packServices.get(CertificationPackType.FACTURAAPI)).toBe(mockService);
    });

    it('should override existing pack service', () => {
      const mockService = {
        generateCFDI: jest.fn(),
      } as ICertificationPackService;

      service.registerPackService(CertificationPackType.FACTURAAPI, mockService);

      const packServices = (service as any).packServices;
      expect(packServices.get(CertificationPackType.FACTURAAPI)).toBe(mockService);
      expect(packServices.get(CertificationPackType.FACTURAAPI)).not.toBe(facturaAPIService);
    });
  });

  describe('organizationId getter', () => {
    it('should return organization ID from tenant context', () => {
      const orgId = (service as any).organizationId;
      expect(orgId).toBe('org-123');
      expect(tenantContext.getOrganizationId).toHaveBeenCalled();
    });

    it('should return empty string when no organization ID', () => {
      tenantContext.getOrganizationId.mockReturnValue(null);

      const orgId = (service as any).organizationId;
      expect(orgId).toBe('');
    });
  });
});
