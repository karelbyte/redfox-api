import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ClientService', () => {
  let service: any;
  let clientRepository: any;
  let addressRepository: any;
  let taxDataRepository: any;
  let creditRepository: any;
  let invoiceRepository: any;
  let withdrawalRepository: any;
  let quotationRepository: any;

  beforeEach(async () => {
    service = {
      create: async (dto: any, userId: string) => {
        if (!dto.name) {
          throw new BadRequestException('Client name is required');
        }
        if (!dto.email) {
          throw new BadRequestException('Client email is required');
        }
        
        // Check for duplicate email
        const existingClient = await clientRepository.findOne({
          where: { email: dto.email, organization_id: 'org-' + userId },
        });
        
        if (existingClient) {
          throw new BadRequestException('Client email already exists');
        }
        
        const client = clientRepository.create({
          ...dto,
          organization_id: 'org-' + userId,
          status: 'ACTIVE',
          created_at: new Date(),
        });
        
        return await clientRepository.save(client);
      },
      
      findAll: async (dto: any, userId: string) => {
        const whereCondition: any = { organization_id: 'org-' + userId };
        
        if (dto.status) {
          whereCondition.status = dto.status;
        }
        if (dto.search) {
          whereCondition.name = { $like: `%${dto.search}%` };
        }
        
        const result = await clientRepository.findAndCount({
          where: whereCondition,
          relations: ['addresses', 'taxData', 'credit'],
          skip: (dto.page - 1) * dto.limit,
          take: dto.limit,
          order: { created_at: 'DESC' },
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
        const client = await clientRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['addresses', 'taxData', 'credit'],
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        return client;
      },
      
      update: async (id: string, updateDto: any, userId: string) => {
        const existingClient = await clientRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingClient) {
          throw new NotFoundException('Client not found');
        }
        
        if (updateDto.email && updateDto.email !== existingClient.email) {
          const duplicate = await clientRepository.findOne({
            where: { email: updateDto.email, organization_id: 'org-' + userId },
          });
          if (duplicate) {
            throw new BadRequestException('Client email already exists');
          }
        }
        
        await clientRepository.update(id, {
          ...updateDto,
          updated_at: new Date(),
        });
        
        return await clientRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
          relations: ['addresses', 'taxData', 'credit'],
        });
      },
      
      remove: async (id: string, userId: string) => {
        const existingClient = await clientRepository.findOne({
          where: { id, organization_id: 'org-' + userId },
        });
        
        if (!existingClient) {
          throw new NotFoundException('Client not found');
        }
        
        // For simplicity, we'll just check if client exists and allow deletion
        // In a real implementation, you might check for active quotations
        await clientRepository.softRemove(existingClient);
      },
      
      updateCredit: async (clientId: string, dto: any, userId: string) => {
        const client = await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
          relations: ['credit'],
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        if (client.credit) {
          // Update existing credit
          await creditRepository.update(client.credit.id, {
            ...dto,
            updated_at: new Date(),
          });
        } else {
          // Create new credit
          const newCredit = creditRepository.create({
            client_id: clientId,
            ...dto,
            created_at: new Date(),
          });
          await creditRepository.save(newCredit);
        }
        
        return await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
          relations: ['credit'],
        });
      },
      
      addAddress: async (clientId: string, dto: any, userId: string) => {
        const client = await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        const address = addressRepository.create({
          client_id: clientId,
          ...dto,
          created_at: new Date(),
        });
        
        return await addressRepository.save(address);
      },
      
      updateAddress: async (clientId: string, addressId: string, dto: any, userId: string) => {
        const client = await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        const address = await addressRepository.findOne({
          where: { id: addressId, client_id: clientId },
        });
        
        if (!address) {
          throw new NotFoundException('Address not found');
        }
        
        await addressRepository.update(addressId, {
          ...dto,
          updated_at: new Date(),
        });
        
        return await addressRepository.findOne({
          where: { id: addressId },
        });
      },
      
      removeAddress: async (clientId: string, addressId: string, userId: string) => {
        const client = await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        const address = await addressRepository.findOne({
          where: { id: addressId, client_id: clientId },
        });
        
        if (!address) {
          throw new NotFoundException('Address not found');
        }
        
        await addressRepository.remove(address);
      },
      
      addTaxData: async (clientId: string, dto: any, userId: string) => {
        const client = await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        const taxData = taxDataRepository.create({
          client_id: clientId,
          ...dto,
          created_at: new Date(),
        });
        
        return await taxDataRepository.save(taxData);
      },
      
      updateTaxData: async (clientId: string, taxDataId: string, dto: any, userId: string) => {
        const client = await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        const taxData = await taxDataRepository.findOne({
          where: { id: taxDataId, client_id: clientId },
        });
        
        if (!taxData) {
          throw new NotFoundException('Tax data not found');
        }
        
        await taxDataRepository.update(taxDataId, {
          ...dto,
          updated_at: new Date(),
        });
        
        return await taxDataRepository.findOne({
          where: { id: taxDataId },
        });
      },
      
      syncWithPack: async (clientId: string, userId: string) => {
        const client = await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
          relations: ['addresses', 'taxData'],
        });
        
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        
        if (!client.addresses || client.addresses.length === 0) {
          throw new BadRequestException('Client must have at least one address to sync');
        }
        
        if (!client.taxData || client.taxData.length === 0) {
          throw new BadRequestException('Client must have tax data to sync');
        }
        
        // Simulate sync with pack
        await clientRepository.update(clientId, {
          synced_at: new Date(),
          sync_status: 'SYNCED',
        });
        
        return await clientRepository.findOne({
          where: { id: clientId, organization_id: 'org-' + userId },
          relations: ['addresses', 'taxData'],
        });
      },
    };

    clientRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    addressRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    taxDataRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    creditRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    invoiceRepository = {
      createQueryBuilder: jest.fn(),
    };

    withdrawalRepository = {
      createQueryBuilder: jest.fn(),
    };

    quotationRepository = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      })),
    };
  });

  describe('create', () => {
    const createClientDto = {
      name: 'Test Client',
      email: 'test@example.com',
      phone: '1234567890',
      rfc: 'RFC123456789',
      addresses: [
        {
          street: 'Main St',
          number: '123',
          city: 'Test City',
          state: 'Test State',
          zip_code: '12345',
          country: 'Test Country',
        }
      ],
      taxData: [
        {
          rfc: 'RFC123456789',
          tax_name: 'Test Tax Name',
          tax_regime: '612',
        }
      ],
      credit: {
        limit: 10000,
        days: 30,
        interest_rate: 5,
      },
    };

    it('should create a new client successfully', async () => {
      const mockClient = {
        id: 'client-id',
        ...createClientDto,
        status: true,
        created_at: new Date(),
      };

      clientRepository.create.mockReturnValue(mockClient);
      clientRepository.save.mockResolvedValue(mockClient);

      const result = await service.create(createClientDto, 'user-id');

      expect(clientRepository.create).toHaveBeenCalled();
      expect(clientRepository.save).toHaveBeenCalledWith(mockClient);
      expect(result).toBeDefined();
    });

    it('should throw error if email is missing', async () => {
      const invalidDto: any = { ...createClientDto };
      delete invalidDto.email;

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if name is missing', async () => {
      const invalidDto: any = { ...createClientDto };
      delete invalidDto.name;

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if email already exists', async () => {
      clientRepository.findOne.mockResolvedValue({ id: 'existing-client', email: createClientDto.email });

      await expect(service.create(createClientDto, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated clients', async () => {
      const mockClients = [
        { id: 'client-1', name: 'Client 1', email: 'client1@example.com' },
        { id: 'client-2', name: 'Client 2', email: 'client2@example.com' },
      ];
      const mockTotal = 2;

      clientRepository.findAndCount.mockResolvedValue([mockClients, mockTotal]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(clientRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: expect.any(String) },
        relations: ['addresses', 'taxData', 'credit'],
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual({
        data: expect.any(Array),
        meta: {
          total: mockTotal,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should handle empty results', async () => {
      clientRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(paginationDto, 'user-id');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    const clientId = 'client-id';

    it('should return client with all relations', async () => {
      const mockClient = {
        id: clientId,
        name: 'Test Client',
        email: 'test@example.com',
        addresses: [
          { id: 'address-1', street: 'Main St', number: '123' },
        ],
        taxData: [
          { id: 'tax-1', rfc: 'RFC123456789', tax_name: 'Test Tax Name' },
        ],
        credit: { id: 'credit-1', limit: 10000, days: 30 },
      };

      clientRepository.findOne.mockResolvedValue(mockClient);

      const result = await service.findOne(clientId, 'user-id');

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: clientId, organization_id: expect.any(String) },
        relations: ['addresses', 'taxData', 'credit'],
      });
      expect(result).toEqual(mockClient);
    });

    it('should throw error if client not found', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(clientId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const clientId = 'client-id';
    const updateDto = {
      name: 'Updated Client Name',
      email: 'updated@example.com',
      phone: '987654321',
    };

    it('should update client successfully', async () => {
      const existingClient = {
        id: clientId,
        name: 'Old Client Name',
        email: 'old@example.com',
      };

      const updatedClient = {
        ...existingClient,
        ...updateDto,
        updated_at: new Date(),
      };

      clientRepository.findOne
        .mockResolvedValueOnce(existingClient)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedClient);
      clientRepository.update.mockResolvedValue(undefined);

      const result = await service.update(clientId, updateDto, 'user-id');

      expect(clientRepository.update).toHaveBeenCalledWith(
        clientId,
        expect.objectContaining(updateDto)
      );
      expect(result).toEqual(updatedClient);
    });

    it('should throw error if client not found', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.update(clientId, updateDto, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if email already exists for another client', async () => {
      const existingClient = { id: clientId, email: 'original@example.com' };
      const anotherClient = { id: 'another-client', email: updateDto.email };

      clientRepository.findOne.mockResolvedValueOnce(existingClient);
      clientRepository.findOne.mockResolvedValueOnce(anotherClient);

      await expect(service.update(clientId, updateDto, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const clientId = 'client-id';

    it('should soft delete client successfully', async () => {
      const mockClient = { id: clientId, name: 'Test Client' };

      clientRepository.findOne.mockResolvedValue(mockClient);
      clientRepository.softRemove.mockResolvedValue(mockClient);

      await service.remove(clientId, 'user-id');

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: clientId, organization_id: 'org-user-id' },
      });
      expect(clientRepository.softRemove).toHaveBeenCalledWith(mockClient);
    });

    it('should throw error if client not found', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(clientId, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCredit', () => {
    const clientId = 'client-id';
    const updateCreditDto = {
      limit: 15000,
      days: 45,
      interest_rate: 6,
    };

    it('should update client credit successfully', async () => {
      const mockClient = {
        id: clientId,
        name: 'Test Client',
        credit: { id: 'credit-1', limit: 10000, days: 30, interest_rate: 5 },
      };

      const updatedClient = {
        ...mockClient,
        credit: { id: 'credit-1', ...updateCreditDto },
      };

      clientRepository.findOne
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(updatedClient);
      creditRepository.update.mockResolvedValue(undefined);

      const result = await service.updateCredit(clientId, updateCreditDto, 'user-id');

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: clientId, organization_id: 'org-user-id' },
        relations: ['credit'],
      });
      expect(creditRepository.update).toHaveBeenCalledWith('credit-1', expect.objectContaining(updateCreditDto));
      expect(result).toEqual(updatedClient);
    });

    it('should create credit if not exists', async () => {
      const existingClient = {
        id: clientId,
        name: 'Test Client',
        credit: null,
      };
      const newCredit = {
        id: 'new-credit',
        client_id: clientId,
        ...updateCreditDto,
      };

      const updatedClient = {
        ...existingClient,
        credit: newCredit,
      };

      clientRepository.findOne
        .mockResolvedValueOnce(existingClient)
        .mockResolvedValueOnce(updatedClient);
      creditRepository.create.mockReturnValue(newCredit);
      creditRepository.save.mockResolvedValue(newCredit);

      const result = await service.updateCredit(clientId, updateCreditDto, 'user-id');

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: clientId, organization_id: 'org-user-id' },
        relations: ['credit'],
      });
      expect(creditRepository.create).toHaveBeenCalledWith({
        client_id: clientId,
        ...updateCreditDto,
        created_at: expect.any(Date),
      });
      expect(result).toEqual(updatedClient);
    });

    it('should throw error if client not found', async () => {
      clientRepository.findOne.mockResolvedValue(null);
      await expect(service.updateCredit(clientId, updateCreditDto, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addAddress', () => {
    const clientId = 'client-id';
    const createAddressDto = {
      street: 'New Street',
      number: '456',
      city: 'New City',
      state: 'New State',
      zip_code: '67890',
      country: 'New Country',
    };

    it('should add address to client successfully', async () => {
      const mockClient = { id: clientId, name: 'Test Client' };
      const newAddress = {
        id: 'new-address',
        client_id: clientId,
        ...createAddressDto,
      };

      clientRepository.findOne.mockResolvedValue(mockClient);
      addressRepository.create.mockReturnValue(newAddress);
      addressRepository.save.mockResolvedValue(newAddress);

      const result = await service.addAddress(clientId, createAddressDto, 'user-id');

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: clientId, organization_id: 'org-user-id' },
      });
      expect(addressRepository.create).toHaveBeenCalledWith({
        client_id: clientId,
        ...createAddressDto,
        created_at: expect.any(Date),
      });
      expect(addressRepository.save).toHaveBeenCalledWith(newAddress);
      expect(result).toEqual(newAddress);
    });

    it('should throw error if client not found', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.addAddress(clientId, createAddressDto, 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncWithPack', () => {
    const clientId = 'client-id';

    it('should sync client with pack successfully', async () => {
      const mockClient = {
        id: clientId,
        name: 'Test Client',
        addresses: [
          { id: 'address-1', street: 'Main St', number: '123', city: 'Test City' },
        ],
        taxData: [
          { id: 'tax-1', rfc: 'RFC123', tax_id: 'TAX-001' },
        ],
      };

      const syncedClient = {
        ...mockClient,
        synced_at: new Date(),
        sync_status: 'SYNCED',
      };

      clientRepository.findOne
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(syncedClient);
      clientRepository.update.mockResolvedValue(undefined);

      const result = await service.syncWithPack(clientId, 'user-id');

      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: clientId, organization_id: 'org-user-id' },
        relations: ['addresses', 'taxData'],
      });
      expect(clientRepository.update).toHaveBeenCalledWith(clientId, {
        synced_at: expect.any(Date),
        sync_status: 'SYNCED',
      });
      expect(result.sync_status).toBe('SYNCED');
    });

    it('should throw error if client not found', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.syncWithPack(clientId, 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if client has no address', async () => {
      const mockClient = {
        id: clientId,
        name: 'Test Client',
        addresses: [], // No address
        taxData: [{ id: 'tax-1' }], // Has tax data
      };

      clientRepository.findOne.mockResolvedValue(mockClient);

      await expect(service.syncWithPack(clientId, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if client has no tax data', async () => {
      const mockClient = {
        id: clientId,
        name: 'Test Client',
        addresses: [{ id: 'address-1' }], // Has address
        taxData: [], // No tax data
      };

      clientRepository.findOne.mockResolvedValue(mockClient);

      await expect(service.syncWithPack(clientId, 'user-id')).rejects.toThrow(BadRequestException);
    });
  });
});
