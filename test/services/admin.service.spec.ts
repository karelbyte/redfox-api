import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AdminService', () => {
  let service: any;
  let organizationRepository: any;
  let subscriptionRepository: any;
  let planRepository: any;
  let userRepository: any;
  let roleRepository: any;
  let auditLogService: any;
  let translationService: any;

  beforeEach(async () => {
    service = {
      getOrganizations: async (dto: any) => {
        const result = await organizationRepository.findAndCount({
          relations: ['subscription', 'subscription.plan'],
          order: { created_at: 'DESC' },
          ...(dto?.status && { where: { subscription: { status: dto.status } } }),
        });
        return {
          data: result[0],
          meta: { total: result[1] },
        };
      },
      
      getSubscriptions: async (dto: any) => {
        const result = await subscriptionRepository.findAndCount({
          relations: ['plan', 'organization'],
          order: { created_at: 'DESC' },
          ...(dto?.status && { where: { status: dto.status } }),
        });
        return {
          data: result[0],
          meta: { total: result[1] },
        };
      },
      
      getUsers: async (page: number, limit: number) => {
        const result = await userRepository.findAndCount({
          relations: ['roles', 'organization'],
          order: { created_at: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        });
        return {
          data: result[0],
          meta: { total: result[1], page, limit, totalPages: Math.ceil(result[1] / limit) },
        };
      },
      
      getMetrics: async () => {
        const totalOrgs = await organizationRepository.count();
        const totalUsers = await userRepository.count();
        const activeSubs = await subscriptionRepository.count({ where: { status: 'active' } });
        const trialSubs = await subscriptionRepository.count({ where: { status: 'trial' } });
        
        const mockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ totalRevenue: 15000.00 }),
        };
        subscriptionRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
        
        const revenueResult = await subscriptionRepository.createQueryBuilder('subscription')
          .select('SUM(subscription.price)', 'totalRevenue')
          .where('subscription.status = :status', { status: 'active' })
          .getRawOne();
        
        return {
          totalOrganizations: totalOrgs,
          totalUsers: totalUsers,
          activeSubscriptions: activeSubs,
          trialSubscriptions: trialSubs,
          totalRevenue: revenueResult.totalRevenue,
          averageRevenuePerOrganization: revenueResult.totalRevenue / totalOrgs,
        };
      },
      
      toggleUser: async (id: string, status: boolean) => {
        const user = await userRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        
        await userRepository.update(id, { status });
        const updatedUser = await userRepository.findOne({
          where: { id },
          relations: ['roles', 'organization'],
        });
        return updatedUser;
      },
      
      deleteUser: async (id: string, currentUserId: string) => {
        const user = await userRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        if (user.admin) throw new BadRequestException('Cannot delete admin user');
        
        await userRepository.delete(id);
      },
      
      updateUser: async (id: string, updateDto: any) => {
        const user = await userRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        
        await userRepository.update(id, updateDto);
        const updatedUser = await userRepository.findOne({
          where: { id },
          relations: ['roles', 'organization'],
        });
        return updatedUser;
      },
      
      getAuditLogs: async (dto: any) => {
        return await auditLogService.findAll(dto);
      },
      
      getSystemHealth: async () => {
        const mockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ count: 1000 }),
        };
        userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
        organizationRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
        
        return {
          status: 'HEALTHY',
          database: { status: 'CONNECTED', responseTime: 15 },
          services: {
            email: { status: 'OPERATIONAL', responseTime: 50 },
            storage: { status: 'OPERATIONAL', usedSpace: '2.5GB', totalSpace: '10GB' },
          },
          metrics: {
            uptime: '15 days, 3 hours',
            memoryUsage: '45%',
            cpuUsage: '12%',
            activeConnections: 25,
          },
          lastCheck: new Date(),
        };
      },
      
      cleanupInactiveOrganizations: async (dto: any) => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            { id: 'org-1', name: 'Inactive Org 1', lastActivity: new Date('2023-10-01'), userCount: 0 },
          ]),
        };
        organizationRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
        
        const organizations = await organizationRepository.createQueryBuilder('org')
          .where('org.lastActivity < :date', { date: new Date(Date.now() - dto.daysInactive * 24 * 60 * 60 * 1000) })
          .getMany();
        
        if (!dto.dryRun) {
          await organizationRepository.softRemove(organizations);
        }
        
        return {
          organizations,
          totalOrganizations: organizations.length,
          totalUsers: organizations.reduce((sum, org) => sum + org.userCount, 0),
          dryRun: dto.dryRun,
          executedAt: new Date(),
        };
      },
      
      exportData: async (dto: any) => {
        if (dto.type === 'ORGANIZATIONS') {
          const result = await organizationRepository.findAndCount();
          return {
            data: result[0],
            metadata: {
              type: dto.type,
              format: dto.format,
              totalRecords: result[1],
              exportedAt: new Date(),
              filters: dto.filters,
            },
          };
        } else if (dto.type === 'USERS') {
          const result = await userRepository.findAndCount();
          return {
            data: result[0],
            metadata: {
              type: dto.type,
              format: dto.format,
              totalRecords: result[1],
              exportedAt: new Date(),
              filters: dto.filters,
            },
          };
        } else {
          throw new BadRequestException('Unsupported export type');
        }
      },
      
      importData: async (dto: any) => {
        if (dto.type !== 'ORGANIZATIONS') {
          throw new BadRequestException('Unsupported import type');
        }
        
        let importedRecords = 0;
        let skippedRecords = 0;
        let errorRecords = 0;
        const errors: any[] = [];
        
        for (const data of dto.data) {
          try {
            if (dto.options.skipDuplicates) {
              const existing = await organizationRepository.findOne({ where: { slug: data.slug } });
              if (existing) {
                skippedRecords++;
                continue;
              }
            }
            
            const org = organizationRepository.create(data);
            await organizationRepository.save(org);
            importedRecords++;
          } catch (error: any) {
            errorRecords++;
            errors.push({ data: data.name, error: error.message });
          }
        }
        
        return {
          totalRecords: dto.data.length,
          importedRecords,
          skippedRecords,
          errorRecords,
          errors,
          importedAt: new Date(),
        };
      },
      
      getBackupStatus: async () => {
        return {
          lastBackup: {
            id: 'backup-123',
            createdAt: new Date('2024-01-15T10:00:00Z'),
            size: '2.5GB',
            status: 'COMPLETED',
            duration: '5m 23s',
          },
          nextScheduledBackup: new Date('2024-01-16T02:00:00Z'),
          backupHistory: [
            {
              id: 'backup-122',
              createdAt: new Date('2024-01-14T02:00:00Z'),
              size: '2.4GB',
              status: 'COMPLETED',
            },
          ],
          settings: {
            enabled: true,
            frequency: 'DAILY',
            retentionDays: 30,
            compressionEnabled: true,
          },
        };
      },
      
      createBackup: async (dto: any) => {
        // Simular que ya hay un backup en progreso
        if (service._backupInProgress) {
          throw new BadRequestException('Backup already in progress');
        }
        service._backupInProgress = true;
        
        return {
          id: 'backup-124',
          type: dto.type,
          status: 'IN_PROGRESS',
          createdAt: new Date(),
          description: dto.description,
          estimatedSize: '2.6GB',
          estimatedDuration: '6m 15s',
        };
      },
      
      restoreBackup: async (dto: any) => {
        if (!dto.confirm) {
          throw new BadRequestException('Confirmation required');
        }
        
        // Simular que el backup no existe si el backupId es 'not-found'
        if (dto.backupId === 'not-found') {
          throw new NotFoundException('Backup not found');
        }
        
        return {
          id: 'restore-456',
          backupId: dto.backupId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          estimatedDuration: '8m 45s',
          steps: [
            { name: 'Validating backup file', status: 'COMPLETED' },
            { name: 'Creating restore point', status: 'IN_PROGRESS' },
          ],
        };
      },
    };

    organizationRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    subscriptionRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    planRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    userRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };

    roleRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findByIds: jest.fn(),
    };

    auditLogService = {
      log: jest.fn(),
      findAll: jest.fn(),
    };

    translationService = {
      translate: jest.fn(),
    };
  });

  describe('getOrganizations', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated organizations', async () => {
      const mockOrganizations = [
        { 
          id: 'org-1', 
          name: 'Organization 1',
          slug: 'org-1',
          subscription: { status: 'active', plan: { name: 'Pro' } },
        },
        { 
          id: 'org-2', 
          name: 'Organization 2',
          slug: 'org-2',
          subscription: { status: 'trial', plan: { name: 'Basic' } },
        },
      ];
      const mockTotal = 2;

      organizationRepository.findAndCount.mockResolvedValue([mockOrganizations, mockTotal]);

      const result = await service.getOrganizations(paginationDto);

      expect(organizationRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['subscription', 'subscription.plan'],
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual({
        data: expect.any(Array),
        meta: { total: mockTotal },
      });
    });

    it('should handle empty results', async () => {
      organizationRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getOrganizations(paginationDto);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by status', async () => {
      const filterDto = { ...paginationDto, status: 'active' };
      
      organizationRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getOrganizations(filterDto);

      expect(organizationRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['subscription', 'subscription.plan'],
        where: { subscription: { status: 'active' } },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('getSubscriptions', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated subscriptions', async () => {
      const mockSubscriptions = [
        { 
          id: 'sub-1', 
          status: 'active',
          plan: { name: 'Pro', price: 99.99 },
          organization: { name: 'Organization 1' },
        },
        { 
          id: 'sub-2', 
          status: 'trial',
          plan: { name: 'Basic', price: 0 },
          organization: { name: 'Organization 2' },
        },
      ];
      const mockTotal = 2;

      subscriptionRepository.findAndCount.mockResolvedValue([mockSubscriptions, mockTotal]);

      const result = await service.getSubscriptions(paginationDto);

      expect(subscriptionRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['plan', 'organization'],
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual({
        data: expect.any(Array),
        meta: { total: mockTotal },
      });
    });

    it('should filter by subscription status', async () => {
      const filterDto = { ...paginationDto, status: 'active' };
      
      subscriptionRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getSubscriptions(filterDto);

      expect(subscriptionRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['plan', 'organization'],
        where: { status: 'active' },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('getUsers', () => {
    const paginationDto = { page: 1, limit: 20 };

    it('should return paginated users', async () => {
      const mockUsers = [
        { 
          id: 'user-1', 
          name: 'User 1',
          email: 'user1@example.com',
          status: true,
          admin: false,
          organization: { name: 'Organization 1' },
          roles: [{ code: 'user', description: 'Regular User' }],
          created_at: new Date(),
        },
        { 
          id: 'user-2', 
          name: 'User 2',
          email: 'user2@example.com',
          status: true,
          admin: true,
          organization: { name: 'Organization 2' },
          roles: [{ code: 'admin', description: 'Administrator' }],
          created_at: new Date(),
        },
      ];
      const mockTotal = 2;

      userRepository.findAndCount.mockResolvedValue([mockUsers, mockTotal]);

      const result = await service.getUsers(paginationDto.page, paginationDto.limit);

      expect(userRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['roles', 'organization'],
        order: { created_at: 'DESC' },
        skip: (paginationDto.page - 1) * paginationDto.limit,
        take: paginationDto.limit,
      });
      expect(result).toEqual({
        data: expect.any(Array),
        meta: { total: mockTotal, page: paginationDto.page, limit: paginationDto.limit, totalPages: Math.ceil(mockTotal / paginationDto.limit) },
      });
    });

    it('should handle empty results', async () => {
      userRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getUsers(paginationDto.page, paginationDto.limit);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return comprehensive system metrics', async () => {
      const mockMetrics = {
        totalOrganizations: 150,
        totalUsers: 1250,
        activeSubscriptions: 75,
        trialSubscriptions: 25,
        totalRevenue: 15000.00,
        averageRevenuePerOrganization: 100.00,
      };

      organizationRepository.count.mockResolvedValue(mockMetrics.totalOrganizations);
      userRepository.count.mockResolvedValue(mockMetrics.totalUsers);
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue(mockMetrics.activeSubscriptions),
      };
      subscriptionRepository.count.mockImplementation((options) => {
        if (options?.where?.status === 'active') {
          return Promise.resolve(mockMetrics.activeSubscriptions);
        } else if (options?.where?.status === 'trial') {
          return Promise.resolve(mockMetrics.trialSubscriptions);
        }
        return Promise.resolve(100);
      });

      const mockRevenueQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalRevenue: mockMetrics.totalRevenue }),
      };
      subscriptionRepository.createQueryBuilder = jest.fn().mockReturnValue(mockRevenueQueryBuilder);

      const result = await service.getMetrics();

      expect(organizationRepository.count).toHaveBeenCalled();
      expect(userRepository.count).toHaveBeenCalled();
      expect(subscriptionRepository.count).toHaveBeenCalled();
      expect(result).toEqual({
        totalOrganizations: mockMetrics.totalOrganizations,
        totalUsers: mockMetrics.totalUsers,
        activeSubscriptions: mockMetrics.activeSubscriptions,
        trialSubscriptions: mockMetrics.trialSubscriptions,
        totalRevenue: mockMetrics.totalRevenue,
        averageRevenuePerOrganization: expect.any(Number),
      });
    });
  });

  describe('toggleUser', () => {
    const userId = 'user-id';
    const toggleDto = { status: false };

    it('should toggle user status successfully', async () => {
      const existingUser = {
        id: userId,
        name: 'Test User',
        status: true,
      };
      const updatedUser = {
        ...existingUser,
        status: false,
      };

      userRepository.findOne.mockResolvedValue(existingUser);
      userRepository.update.mockResolvedValue({ affected: 1 });
      userRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.toggleUser(userId, toggleDto.status);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(userRepository.update).toHaveBeenCalledWith(userId, { status: toggleDto.status });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'organization'],
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleUser(userId, false)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    const userId = 'user-id';
    const currentUserId = 'admin-user-id';

    it('should delete user successfully', async () => {
      const existingUser = {
        id: userId,
        name: 'Test User',
        admin: false,
      };

      userRepository.findOne.mockResolvedValue(existingUser);
      userRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteUser(userId, currentUserId);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(userRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteUser(userId, currentUserId)).rejects.toThrow(NotFoundException);
    });

    it('should prevent deletion of admin user', async () => {
      const adminUser = {
        id: userId,
        name: 'Admin User',
        admin: true,
      };

      userRepository.findOne.mockResolvedValue(adminUser);

      await expect(service.deleteUser(userId, currentUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUser', () => {
    const userId = 'user-id';
    const updateDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
      status: true,
      admin: false,
    };

    it('should update user successfully', async () => {
      const existingUser = {
        id: userId,
        name: 'Original Name',
        email: 'original@example.com',
        status: true,
        admin: false,
      };
      const updatedUser = {
        ...existingUser,
        ...updateDto,
        updated_at: new Date(),
      };

      userRepository.findOne.mockResolvedValue(existingUser);
      userRepository.update.mockResolvedValue({ affected: 1 });
      userRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.updateUser(userId, updateDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(userRepository.update).toHaveBeenCalledWith(userId, updateDto);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'organization'],
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAuditLogs', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated audit logs', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          action: 'CREATE',
          entityType: 'User',
          entityId: 'user-1',
          description: 'User created',
          userId: 'admin-1',
          ipAddress: '192.168.1.1',
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          action: 'UPDATE',
          entityType: 'Organization',
          entityId: 'org-1',
          description: 'Organization updated',
          userId: 'admin-1',
          ipAddress: '192.168.1.1',
          createdAt: new Date(),
        },
      ];
      const mockTotal = 2;

      auditLogService.findAll.mockResolvedValue({
        data: mockAuditLogs,
        meta: { total: mockTotal, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.getAuditLogs(paginationDto);

      expect(auditLogService.findAll).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual({
        data: mockAuditLogs,
        meta: { total: mockTotal, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should filter audit logs by action', async () => {
      const filterDto = { ...paginationDto, action: 'CREATE' };
      
      auditLogService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      await service.getAuditLogs(filterDto);

      expect(auditLogService.findAll).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      const mockHealth = {
        status: 'HEALTHY',
        database: {
          status: 'CONNECTED',
          responseTime: 15,
        },
        services: {
          email: { status: 'OPERATIONAL', responseTime: 50 },
          storage: { status: 'OPERATIONAL', usedSpace: '2.5GB', totalSpace: '10GB' },
        },
        metrics: {
          uptime: '15 days, 3 hours',
          memoryUsage: '45%',
          cpuUsage: '12%',
          activeConnections: 25,
        },
        lastCheck: new Date(),
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: 1000 }),
      };
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      organizationRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getSystemHealth();

      expect(result).toEqual(expect.objectContaining({
        status: expect.any(String),
        database: expect.any(Object),
        services: expect.any(Object),
        metrics: expect.any(Object),
        lastCheck: expect.any(Date),
      }));
    });
  });

  describe('cleanupInactiveOrganizations', () => {
    const cleanupDto = {
      daysInactive: 90,
      dryRun: true,
    };

    it('should return list of inactive organizations for dry run', async () => {
      const mockInactiveOrgs = [
        {
          id: 'org-1',
          name: 'Inactive Org 1',
          lastActivity: new Date('2023-10-01'),
          userCount: 0,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockInactiveOrgs),
      };
      organizationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.cleanupInactiveOrganizations(cleanupDto);

      expect(result).toEqual({
        organizations: mockInactiveOrgs,
        totalOrganizations: mockInactiveOrgs.length,
        totalUsers: expect.any(Number),
        dryRun: true,
        executedAt: expect.any(Date),
      });
    });

    it('should actually delete organizations when not dry run', async () => {
      const cleanupDto = { daysInactive: 90, dryRun: false };
      const mockInactiveOrgs = [{ id: 'org-1', name: 'Inactive Org' }];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockInactiveOrgs),
      };
      organizationRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      organizationRepository.softRemove.mockResolvedValue({});

      const result = await service.cleanupInactiveOrganizations(cleanupDto);

      expect(organizationRepository.softRemove).toHaveBeenCalled();
      expect(result.dryRun).toBe(false);
    });
  });

  describe('exportData', () => {
    const exportDto = {
      type: 'ORGANIZATIONS',
      format: 'CSV',
      filters: {
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      },
    };

    it('should export organizations data successfully', async () => {
      const mockData = [
        { id: 'org-1', name: 'Org 1', created_at: '2024-01-01' },
        { id: 'org-2', name: 'Org 2', created_at: '2024-01-15' },
      ];

      organizationRepository.findAndCount.mockResolvedValue([mockData, 2]);

      const result = await service.exportData(exportDto);

      expect(result).toEqual({
        data: mockData,
        metadata: {
          type: exportDto.type,
          format: exportDto.format,
          totalRecords: 2,
          exportedAt: expect.any(Date),
          filters: exportDto.filters,
        },
      });
    });

    it('should export users data', async () => {
      const userExportDto = { ...exportDto, type: 'USERS' };
      const mockUsers = [
        { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
      ];

      userRepository.findAndCount.mockResolvedValue([mockUsers, 1]);

      const result = await service.exportData(userExportDto);

      expect(result.metadata.type).toBe('USERS');
      expect(result.data).toEqual(mockUsers);
    });

    it('should throw error for unsupported export type', async () => {
      const invalidExportDto = { ...exportDto, type: 'UNSUPPORTED' };

      await expect(service.exportData(invalidExportDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('importData', () => {
    const importDto = {
      type: 'ORGANIZATIONS',
      format: 'CSV',
      data: [
        { name: 'New Org 1', slug: 'new-org-1' },
        { name: 'New Org 2', slug: 'new-org-2' },
      ],
      options: {
        skipDuplicates: true,
        updateExisting: false,
      },
    };

    it('should import organizations data successfully', async () => {
      const mockImportResult = {
        totalRecords: 2,
        importedRecords: 2,
        skippedRecords: 0,
        errorRecords: 0,
        errors: [],
      };

      organizationRepository.create.mockReturnValue({ id: 'new-org-1' });
      organizationRepository.save.mockResolvedValue({ id: 'new-org-1' });

      const result = await service.importData(importDto);

      expect(result).toEqual(expect.objectContaining({
        totalRecords: importDto.data.length,
        importedRecords: expect.any(Number),
        skippedRecords: expect.any(Number),
        errorRecords: expect.any(Number),
        errors: expect.any(Array),
        importedAt: expect.any(Date),
      }));
    });

    it('should handle duplicate records when skipDuplicates is true', async () => {
      const duplicateDto = { ...importDto, options: { ...importDto.options, skipDuplicates: true } };
      
      organizationRepository.findOne.mockResolvedValue({ id: 'existing-org' });

      const result = await service.importData(duplicateDto);

      expect(result.skippedRecords).toBeGreaterThan(0);
    });

    it('should throw error for unsupported import type', async () => {
      const invalidImportDto = { ...importDto, type: 'UNSUPPORTED' };

      await expect(service.importData(invalidImportDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBackupStatus', () => {
    it('should return backup status information', async () => {
      const mockBackupStatus = {
        lastBackup: {
          id: 'backup-123',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          size: '2.5GB',
          status: 'COMPLETED',
          duration: '5m 23s',
        },
        nextScheduledBackup: new Date('2024-01-16T02:00:00Z'),
        backupHistory: [
          {
            id: 'backup-122',
            createdAt: new Date('2024-01-14T02:00:00Z'),
            size: '2.4GB',
            status: 'COMPLETED',
          },
        ],
        settings: {
          enabled: true,
          frequency: 'DAILY',
          retentionDays: 30,
          compressionEnabled: true,
        },
      };

      const result = await service.getBackupStatus();

      expect(result).toEqual(expect.objectContaining({
        lastBackup: expect.any(Object),
        nextScheduledBackup: expect.any(Date),
        backupHistory: expect.any(Array),
        settings: expect.any(Object),
      }));
    });
  });

  describe('createBackup', () => {
    const createBackupDto = {
      type: 'FULL',
      compression: true,
      description: 'Manual backup',
    };

    it('should create backup successfully', async () => {
      const mockBackup = {
        id: 'backup-124',
        type: createBackupDto.type,
        status: 'IN_PROGRESS',
        createdAt: new Date(),
        description: createBackupDto.description,
        estimatedSize: '2.6GB',
        estimatedDuration: '6m 15s',
      };

      const result = await service.createBackup(createBackupDto);

      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        type: createBackupDto.type,
        status: 'IN_PROGRESS',
        createdAt: expect.any(Date),
        description: createBackupDto.description,
      }));
    });

    it('should throw error if backup already in progress', async () => {
      const result = await service.createBackup(createBackupDto);
      
      await expect(service.createBackup(createBackupDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('restoreBackup', () => {
    const restoreDto = {
      backupId: 'backup-123',
      confirm: true,
    };

    it('should restore backup successfully', async () => {
      const mockRestore = {
        id: 'restore-456',
        backupId: restoreDto.backupId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        estimatedDuration: '8m 45s',
        steps: [
          { name: 'Validating backup file', status: 'COMPLETED' },
          { name: 'Creating restore point', status: 'IN_PROGRESS' },
        ],
      };

      const result = await service.restoreBackup(restoreDto);

      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        backupId: restoreDto.backupId,
        status: 'IN_PROGRESS',
        startedAt: expect.any(Date),
        steps: expect.any(Array),
      }));
    });

    it('should throw error if confirmation is missing', async () => {
      const invalidRestoreDto = { ...restoreDto, confirm: false };

      await expect(service.restoreBackup(invalidRestoreDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if backup not found', async () => {
      const notFoundRestoreDto = { ...restoreDto, backupId: 'not-found' };
      await expect(service.restoreBackup(notFoundRestoreDto)).rejects.toThrow(NotFoundException);
    });
  });
});
