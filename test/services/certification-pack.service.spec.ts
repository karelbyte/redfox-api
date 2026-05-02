import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificationPackService } from '../../src/services/certification-pack.service';
import { CertificationPack } from '../../src/models/certification-pack.entity';
import { CertificationPackEmitter } from '../../src/models/certification-pack-emitter.entity';
import { CertificationPackType } from '../../src/constants/certification-packs.constant';
import { TenantContext } from '../../src/services/tenant-context.service';
import { TranslationService } from '../../src/services/translation.service';
import { UserContextService } from '../../src/services/user-context.service';

describe('CertificationPackService', () => {
  let service: CertificationPackService;
  let certificationPackRepository: jest.Mocked<Repository<CertificationPack>>;
  let certificationPackEmitterRepository: jest.Mocked<Repository<CertificationPackEmitter>>;
  let tenantContext: jest.Mocked<TenantContext>;
  let translationService: jest.Mocked<TranslationService>;
  let userContextService: jest.Mocked<UserContextService>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repositories
    certificationPackRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    certificationPackEmitterRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Mock services
    tenantContext = {
      getOrganizationId: jest.fn().mockResolvedValue('org-123'),
      getUserId: jest.fn().mockReturnValue('user-123'),
    } as any;

    translationService = {
      translate: jest.fn(),
    } as any;

    userContextService = {
      getUserLanguageCode: jest.fn().mockResolvedValue('es'),
    } as any;

    // Create service instance
    service = new CertificationPackService(
      certificationPackRepository,
      certificationPackEmitterRepository,
      tenantContext,
      translationService,
      userContextService,
    );
  });

  describe('getOrganizationId', () => {
    it('should return organization ID', async () => {
      const orgId = await service['getOrganizationId']();
      expect(orgId).toBe('org-123');
    });

    it('should throw error if no organization ID', async () => {
      tenantContext.getOrganizationId.mockReturnValue(undefined as any);
      translationService.translate.mockResolvedValue('Organization required');

      await expect(service['getOrganizationId']()).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    const createDto = {
      type: CertificationPackType.FACTURA_GREEN,
      config: { business_uuid: 'test-business-uuid' },
      is_active: true,
      is_default: false,
    };

    it('should create certification pack successfully', async () => {
      const mockPack = { id: 'pack-1', ...createDto, organization_id: 'org-123' };
      certificationPackRepository.create.mockReturnValue(mockPack);
      certificationPackRepository.save.mockResolvedValue(mockPack);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPack);
      expect(certificationPackRepository.create).toHaveBeenCalledWith({
        ...createDto,
        config: createDto.config || {},
        organization_id: 'org-123',
      });
      expect(certificationPackRepository.save).toHaveBeenCalledWith(mockPack);
    });

    it('should create pack with emitters', async () => {
      const createDtoWithEmitters = {
        ...createDto,
        emitters: [
          { emitter: 'emitter-1', name: 'Test Emitter', fav: true, status: 'active' },
        ],
      };

      const mockPack = { id: 'pack-1', ...createDtoWithEmitters, organization_id: 'org-123' };
      const mockEmitter = { id: 'emitter-1', pack_id: 'pack-1', ...createDtoWithEmitters.emitters[0] };

      certificationPackRepository.create.mockReturnValue(mockPack);
      certificationPackRepository.save.mockResolvedValue(mockPack);
      certificationPackEmitterRepository.create.mockReturnValue(mockEmitter);
      certificationPackEmitterRepository.save.mockResolvedValue(mockEmitter);

      const result = await service.create(createDtoWithEmitters);

      expect(result).toEqual(mockPack);
      expect(certificationPackEmitterRepository.create).toHaveBeenCalledWith({
        ...createDtoWithEmitters.emitters[0],
        pack_id: 'pack-1',
      });
    });

    it('should create default emitter automatically when no emitters provided', async () => {
      const mockPack = { 
        id: 'pack-1', 
        ...createDto, 
        organization_id: 'org-123',
        type: CertificationPackType.FACTURA_GREEN,
        config: { business_uuid: 'test-business-uuid' }
      };
      
      certificationPackRepository.create.mockReturnValue(mockPack);
      certificationPackRepository.save.mockResolvedValue(mockPack);
      
      const mockEmitter = { 
        id: 'emitter-1', 
        emitter: 'test-business-uuid', 
        name: 'Principal', 
        fav: true, 
        status: 'active', 
        pack_id: 'pack-1' 
      };
      
      certificationPackEmitterRepository.create.mockReturnValue(mockEmitter);
      certificationPackEmitterRepository.save.mockResolvedValue(mockEmitter);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPack);
      expect(certificationPackEmitterRepository.create).toHaveBeenCalledWith({
        emitter: 'test-business-uuid',
        name: 'Principal',
        fav: true,
        status: 'active',
        pack_id: 'pack-1',
      });
    });

    it('should unset default packs when creating default pack', async () => {
      const createDtoWithDefault = { ...createDto, is_default: true };
      const mockPack = { id: 'pack-1', ...createDtoWithDefault, organization_id: 'org-123' };

      certificationPackRepository.create.mockReturnValue(mockPack);
      certificationPackRepository.save.mockResolvedValue(mockPack);

      await service.create(createDtoWithDefault);

      expect(certificationPackRepository.update).toHaveBeenCalledWith(
        { is_default: true, organization_id: 'org-123' },
        { is_default: false }
      );
    });
  });

  describe('findAll', () => {
    it('should return all certification packs for organization', async () => {
      const mockPacks = [
        { id: 'pack-1', name: 'Pack 1' },
        { id: 'pack-2', name: 'Pack 2' },
      ];

      certificationPackRepository.find.mockResolvedValue(mockPacks as any);

      const result = await service.findAll();

      expect(result).toEqual(mockPacks);
      expect(certificationPackRepository.find).toHaveBeenCalledWith({
        where: { organization_id: 'org-123' },
        order: { created_at: 'DESC' },
        relations: ['emitters'],
      });
    });
  });

  describe('findOne', () => {
    it('should return certification pack by ID', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack' };
      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);

      const result = await service.findOne('pack-1');

      expect(result).toEqual(mockPack);
      expect(certificationPackRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'pack-1', organization_id: 'org-123' },
        relations: ['emitters'],
      });
    });

    it('should throw NotFoundException when pack not found', async () => {
      certificationPackRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Pack not found');

      await expect(service.findOne('pack-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActive', () => {
    it('should return default active pack', async () => {
      const mockPack = { id: 'pack-1', is_default: true, is_active: true };
      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);

      const result = await service.findActive();

      expect(result).toEqual(mockPack);
      expect(certificationPackRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_default: true,
          is_active: true,
          organization_id: 'org-123',
        },
      });
    });

    it('should return first active pack when no default pack', async () => {
      certificationPackRepository.findOne
        .mockResolvedValueOnce(null) // No default pack
        .mockResolvedValueOnce({ id: 'pack-1', is_active: true } as any); // First active pack

      const result = await service.findActive();

      expect(result).toEqual({ id: 'pack-1', is_active: true });
      expect(certificationPackRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null when no active packs', async () => {
      certificationPackRepository.findOne.mockResolvedValue(null);

      const result = await service.findActive();

      expect(result).toBeNull();
    });
  });

  describe('findAvailableEmitters', () => {
    it('should return available emitters from active pack', async () => {
      const mockPack = {
        id: 'pack-1',
        emitters: [
          { id: 'emitter-1', status: 'active', fav: true, pack_id: 'pack-1' },
          { id: 'emitter-2', status: 'active', fav: false, pack_id: 'pack-1' },
          { id: 'emitter-3', status: 'inactive', fav: true, pack_id: 'pack-1' },
        ],
      };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);

      const result = await service.findAvailableEmitters();

      expect(result).toEqual([
        { id: 'emitter-1', status: 'active', fav: true, pack_id: 'pack-1' },
        { id: 'emitter-2', status: 'active', fav: false, pack_id: 'pack-1' },
      ]);
    });

    it('should return empty array when no active pack', async () => {
      certificationPackRepository.findOne.mockResolvedValue(null);

      const result = await service.findAvailableEmitters();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const updateDto = {
      config: { updated: true },
    };

    it('should update certification pack successfully', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack', organization_id: 'org-123' };
      const updatedPack = { ...mockPack, ...updateDto };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackRepository.save.mockResolvedValue(updatedPack);

      const result = await service.update('pack-1', updateDto);

      expect(result).toEqual(updatedPack);
      expect(certificationPackRepository.save).toHaveBeenCalledWith(updatedPack);
    });

    it('should unset default packs when setting pack as default', async () => {
      const updateDtoWithDefault = { ...updateDto, is_default: true };
      const mockPack = { id: 'pack-1', name: 'Test Pack', is_default: false };
      const updatedPack = { ...mockPack, ...updateDtoWithDefault };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackRepository.save.mockResolvedValue(updatedPack);

      await service.update('pack-1', updateDtoWithDefault);

      expect(certificationPackRepository.update).toHaveBeenCalledWith(
        { is_default: true, organization_id: 'org-123' },
        { is_default: false }
      );
    });

    it('should update emitters when provided', async () => {
      const updateDtoWithEmitters = {
        ...updateDto,
        emitters: [
          { emitter: 'emitter-1', name: 'Updated Emitter', fav: true, status: 'active' },
        ],
      };

      const mockPack = { id: 'pack-1', name: 'Test Pack' };
      const mockEmitter = { id: 'emitter-1', pack_id: 'pack-1', ...updateDtoWithEmitters.emitters[0] };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackRepository.save.mockResolvedValue(mockPack);
      certificationPackEmitterRepository.create.mockReturnValue(mockEmitter);
      certificationPackEmitterRepository.save.mockResolvedValue(mockEmitter);

      await service.update('pack-1', updateDtoWithEmitters);

      expect(certificationPackEmitterRepository.delete).toHaveBeenCalledWith({ pack_id: 'pack-1' });
      expect(certificationPackEmitterRepository.create).toHaveBeenCalledWith({
        ...updateDtoWithEmitters.emitters[0],
        pack_id: 'pack-1',
      });
    });

    it('should delete emitters when empty emitters array provided', async () => {
      const updateDtoWithEmptyEmitters = {
        ...updateDto,
        emitters: [],
      };

      const mockPack = { id: 'pack-1', name: 'Test Pack' };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackRepository.save.mockResolvedValue(mockPack);

      await service.update('pack-1', updateDtoWithEmptyEmitters);

      expect(certificationPackEmitterRepository.delete).toHaveBeenCalledWith({ pack_id: 'pack-1' });
      expect(certificationPackEmitterRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove certification pack successfully', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack' };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackRepository.softRemove.mockResolvedValue(mockPack);

      await service.remove('pack-1');

      expect(certificationPackRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'pack-1', organization_id: 'org-123' },
        relations: ['emitters'],
      });
      expect(certificationPackRepository.softRemove).toHaveBeenCalledWith(mockPack);
    });
  });

  describe('setDefault', () => {
    it('should set pack as default successfully', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack', is_active: true, is_default: false };
      const updatedPack = { ...mockPack, is_default: true };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackRepository.save.mockResolvedValue(updatedPack);

      const result = await service.setDefault('pack-1');

      expect(result).toEqual(updatedPack);
      expect(certificationPackRepository.update).toHaveBeenCalledWith(
        { is_default: true, organization_id: 'org-123' },
        { is_default: false }
      );
      expect(certificationPackRepository.save).toHaveBeenCalledWith(updatedPack);
    });

    it('should throw error when trying to set inactive pack as default', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack', is_active: false };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      translationService.translate.mockResolvedValue('Cannot set inactive pack as default');

      await expect(service.setDefault('pack-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('addEmitter', () => {
    it('should add emitter to pack successfully', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack' };
      const emitterDto = {
        emitter: 'emitter-1',
        name: 'Test Emitter',
        fav: true,
        status: 'active',
      };
      const mockEmitter = { id: 'emitter-1', pack_id: 'pack-1', ...emitterDto };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackEmitterRepository.create.mockReturnValue(mockEmitter);
      certificationPackEmitterRepository.save.mockResolvedValue(mockEmitter);

      const result = await service.addEmitter('pack-1', emitterDto);

      expect(result).toEqual(mockEmitter);
      expect(certificationPackEmitterRepository.create).toHaveBeenCalledWith({
        ...emitterDto,
        pack_id: 'pack-1',
      });
    });
  });

  describe('updateEmitter', () => {
    it('should update emitter successfully', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack' };
      const mockEmitter = { id: 'emitter-1', pack_id: 'pack-1', name: 'Test Emitter' };
      const updateDto = { name: 'Updated Emitter' };
      const updatedEmitter = { ...mockEmitter, ...updateDto };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackEmitterRepository.findOne.mockResolvedValue(mockEmitter as any);
      certificationPackEmitterRepository.save.mockResolvedValue(updatedEmitter);

      const result = await service.updateEmitter('pack-1', 'emitter-1', updateDto);

      expect(result).toEqual(updatedEmitter);
      expect(certificationPackEmitterRepository.save).toHaveBeenCalledWith(updatedEmitter);
    });

    it('should throw NotFoundException when emitter not found', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack' };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackEmitterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Emitter not found');

      await expect(service.updateEmitter('pack-1', 'emitter-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeEmitter', () => {
    it('should remove emitter successfully', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack' };
      const mockEmitter = { id: 'emitter-1', pack_id: 'pack-1', name: 'Test Emitter' };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackEmitterRepository.findOne.mockResolvedValue(mockEmitter as any);
      certificationPackEmitterRepository.softRemove.mockResolvedValue(mockEmitter);

      await service.removeEmitter('pack-1', 'emitter-1');

      expect(certificationPackEmitterRepository.softRemove).toHaveBeenCalledWith(mockEmitter);
    });

    it('should throw NotFoundException when emitter not found', async () => {
      const mockPack = { id: 'pack-1', name: 'Test Pack' };

      certificationPackRepository.findOne.mockResolvedValue(mockPack as any);
      certificationPackEmitterRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('Emitter not found');

      await expect(service.removeEmitter('pack-1', 'emitter-1')).rejects.toThrow(NotFoundException);
    });
  });
});
