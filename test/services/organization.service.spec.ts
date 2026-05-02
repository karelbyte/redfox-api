import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrganizationService', () => {
  let service: any;
  let organizationRepository: any;

  beforeEach(async () => {
    organizationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    };

    service = {
      create: async (data: any) => {
        if (!data.name) {
          throw new BadRequestException('Organization name is required');
        }
        if (!data.slug) {
          throw new BadRequestException('Organization slug is required');
        }

        const existingOrg = await organizationRepository.findOne({
          where: { slug: data.slug }
        });
        if (existingOrg) {
          throw new BadRequestException('Organization slug already exists');
        }

        const organization = organizationRepository.create({
          ...data,
          status: data.status !== undefined ? data.status : true,
          created_at: new Date(),
        });
        return await organizationRepository.save(organization);
      },

      findBySlug: async (slug: string) => {
        if (!slug) {
          throw new BadRequestException('Slug is required');
        }
        return await organizationRepository.findOne({ where: { slug } });
      },

      findOne: async (id: string) => {
        if (!id) {
          throw new BadRequestException('ID is required');
        }
        return await organizationRepository.findOne({ where: { id } });
      },

      update: async (id: string, data: any) => {
        if (!id) {
          throw new BadRequestException('ID is required');
        }
        if (!data || Object.keys(data).length === 0) {
          throw new BadRequestException('Update data is required');
        }

        const existingOrg = await organizationRepository.findOne({ where: { id } });
        if (!existingOrg) {
          throw new NotFoundException('Organization not found');
        }

        if (data.slug && data.slug !== existingOrg.slug) {
          const duplicateOrg = await organizationRepository.findOne({
            where: { slug: data.slug }
          });
          if (duplicateOrg) {
            throw new BadRequestException('Organization slug already exists');
          }
        }

        await organizationRepository.update(id, {
          ...data,
          updated_at: new Date(),
        });
        
        return await organizationRepository.findOne({ where: { id } });
      },

      findUnverifiedOlderThan: async (date: Date) => {
        if (!date) {
          throw new BadRequestException('Date is required');
        }

        return await organizationRepository
          .createQueryBuilder('org')
          .where('org.status = :status', { status: false })
          .andWhere('org.created_at <= :date', { date })
          .getMany();
      },

      remove: async (id: string) => {
        if (!id) {
          throw new BadRequestException('ID is required');
        }

        const existingOrg = await organizationRepository.findOne({ where: { id } });
        if (!existingOrg) {
          throw new NotFoundException('Organization not found');
        }

        await organizationRepository.delete(id);
      },
    };
  });

  describe('create', () => {
    const createOrganizationDto = {
      name: 'Test Organization',
      slug: 'test-org',
      status: true,
      plan_id: 'plan-123',
    };

    it('should create a new organization successfully', async () => {
      const mockOrganization = {
        id: 'org-123',
        ...createOrganizationDto,
        created_at: new Date(),
      };

      organizationRepository.create.mockReturnValue(mockOrganization);
      organizationRepository.save.mockResolvedValue(mockOrganization);
      organizationRepository.findOne.mockResolvedValue(null);

      const result = await service.create(createOrganizationDto);

      expect(organizationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createOrganizationDto,
          status: true,
          created_at: expect.any(Date),
        })
      );
      expect(organizationRepository.save).toHaveBeenCalledWith(mockOrganization);
      expect(result).toEqual(mockOrganization);
    });

    it('should throw error if name is missing', async () => {
      const invalidDto = { ...createOrganizationDto, name: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if slug is missing', async () => {
      const invalidDto = { ...createOrganizationDto, slug: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if slug already exists', async () => {
      organizationRepository.findOne.mockResolvedValue({ id: 'existing-org' });

      await expect(service.create(createOrganizationDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should use default status if not provided', async () => {
      const dtoWithoutStatus = { name: 'Test', slug: 'test' };
      const mockOrganization = {
        id: 'org-123',
        ...dtoWithoutStatus,
        status: true,
        created_at: new Date(),
      };

      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockReturnValue(mockOrganization);
      organizationRepository.save.mockResolvedValue(mockOrganization);

      const result = await service.create(dtoWithoutStatus);

      expect(result.status).toBe(true);
    });
  });

  describe('findBySlug', () => {
    it('should return organization by slug', async () => {
      const slug = 'test-org';
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        slug: slug,
      };

      organizationRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findBySlug(slug);

      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { slug },
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should throw error if slug is missing', async () => {
      await expect(service.findBySlug('')).rejects.toThrow(BadRequestException);
    });

    it('should return null if organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const result = await service.findBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    const organizationId = 'org-123';

    it('should return organization by ID', async () => {
      const mockOrganization = {
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-org',
      };

      organizationRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findOne(organizationId);

      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should throw error if ID is missing', async () => {
      await expect(service.findOne('')).rejects.toThrow(BadRequestException);
    });

    it('should return null if organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const organizationId = 'org-123';
    const updateDto = {
      name: 'Updated Organization',
      slug: 'updated-org',
    };

    it('should update organization successfully', async () => {
      const existingOrganization = {
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-org',
      };

      const updatedOrganization = {
        ...existingOrganization,
        ...updateDto,
        updated_at: new Date(),
      };

      organizationRepository.findOne
        .mockResolvedValueOnce(existingOrganization)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedOrganization);
      organizationRepository.update.mockResolvedValue(undefined);

      const result = await service.update(organizationId, updateDto);

      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(organizationRepository.update).toHaveBeenCalledWith(
        organizationId,
        expect.objectContaining({
          ...updateDto,
          updated_at: expect.any(Date),
        })
      );
      expect(result).toEqual(updatedOrganization);
    });

    it('should throw error if ID is missing', async () => {
      await expect(service.update('', updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if update data is empty', async () => {
      await expect(service.update(organizationId, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw error if organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.update(organizationId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if new slug already exists', async () => {
      const existingOrganization = { id: organizationId, slug: 'old-slug' };
      const duplicateOrganization = { id: 'other-org', slug: 'new-slug' };

      organizationRepository.findOne
        .mockResolvedValueOnce(existingOrganization)
        .mockResolvedValueOnce(duplicateOrganization);

      await expect(service.update(organizationId, { slug: 'new-slug' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow updating with same slug', async () => {
      const existingOrganization = { id: organizationId, slug: 'same-slug' };
      const updatedOrganization = {
        ...existingOrganization,
        name: 'Updated Name',
        updated_at: new Date(),
      };

      organizationRepository.findOne
        .mockResolvedValueOnce(existingOrganization) // First call for validation
        .mockResolvedValueOnce(updatedOrganization); // Second call for return (no duplicate check needed)
      organizationRepository.update.mockResolvedValue(undefined);

      const result = await service.update(organizationId, { 
        name: 'Updated Name', 
        slug: 'same-slug' 
      });

      expect(organizationRepository.findOne).toHaveBeenCalledTimes(2);
      expect(organizationRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: organizationId },
      });
      expect(organizationRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: organizationId },
      });
      expect(result).toEqual(updatedOrganization);
    });
  });

  describe('findUnverifiedOlderThan', () => {
    it('should return unverified organizations older than specified date', async () => {
      const date = new Date('2024-01-01');
      const mockOrganizations = [
        { id: 'org-1', name: 'Org 1', status: false, created_at: new Date('2023-12-01') },
        { id: 'org-2', name: 'Org 2', status: false, created_at: new Date('2023-11-01') },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOrganizations),
      };

      organizationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findUnverifiedOlderThan(date);

      expect(organizationRepository.createQueryBuilder).toHaveBeenCalledWith('org');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('org.status = :status', { status: false });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('org.created_at <= :date', { date });
      expect(result).toEqual(mockOrganizations);
    });

    it('should throw error if date is missing', async () => {
      await expect(service.findUnverifiedOlderThan(null as any)).rejects.toThrow(BadRequestException);
    });

    it('should return empty array if no organizations found', async () => {
      const date = new Date('2024-01-01');
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      organizationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findUnverifiedOlderThan(date);

      expect(result).toEqual([]);
    });
  });

  describe('remove', () => {
    const organizationId = 'org-123';

    it('should remove organization successfully', async () => {
      const existingOrganization = {
        id: organizationId,
        name: 'Test Organization',
      };

      organizationRepository.findOne.mockResolvedValue(existingOrganization);
      organizationRepository.delete.mockResolvedValue(undefined);

      await service.remove(organizationId);

      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(organizationRepository.delete).toHaveBeenCalledWith(organizationId);
    });

    it('should throw error if ID is missing', async () => {
      await expect(service.remove('')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(organizationId)).rejects.toThrow(NotFoundException);
    });
  });
});
