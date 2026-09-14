import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { hash } from 'bcrypt';

describe('UserService', () => {
  let service: any;
  let userRepository: any;
  let roleService: any;
  let translationService: any;
  let tenantContext: any;
  let emailService: any;
  let notificationService: any;

  beforeEach(async () => {
    userRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      merge: jest.fn(),
      softRemove: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    roleService = {
      findOneEntity: jest.fn(),
    };

    translationService = {
      translate: jest.fn(),
    };

    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-123'),
    };

    emailService = {
      sendSystemEmail: jest.fn(),
    };

    notificationService = {
      create: jest.fn(),
    };

    service = {
      async create(createUserDto: any, userId?: string) {
        if (!createUserDto.name || !createUserDto.email) {
          throw new BadRequestException('Name and email are required');
        }

        const existingUser = await userRepository.findOne({
          where: { email: createUserDto.email }
        });
        if (existingUser) {
          throw new BadRequestException('Email already exists');
        }

        const user = userRepository.create({
          ...createUserDto,
          organization_id: tenantContext.getOrganizationId(),
        });

        if (createUserDto.password) {
          user.password = await hash(createUserDto.password, 10);
        }

        if (createUserDto.role_ids) {
          const roles = await Promise.all(
            createUserDto.role_ids.map((id: string) => roleService.findOneEntity(id))
          );
          user.roles = roles;
        }

        const savedUser = await userRepository.save(user);
        return this.mapToResponseDto(savedUser);
      },

      async findAll(paginationDto: any, userId?: string) {
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;

        const [users, total] = await userRepository.findAndCount({
          where: { organization_id: tenantContext.getOrganizationId() },
          relations: [
            'roles',
            'roles.rolePermissions',
            'roles.rolePermissions.permission',
            'organization',
          ],
          withDeleted: false,
          skip,
          take: limit,
        });

        const data = users.map((user: any) => this.mapToResponseDto(user));

        return {
          data,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },

      async findOne(id: string, userId?: string) {
        const user = await userRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          relations: [
            'roles',
            'roles.rolePermissions',
            'roles.rolePermissions.permission',
            'organization',
          ],
          withDeleted: false,
        });

        if (!user) {
          const message = await translationService.translate(
            'user.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        return this.mapToResponseDto(user);
      },

      async findOneWithPermissionDescriptions(id: string, userId?: string) {
        const user = await userRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          relations: [
            'roles',
            'roles.rolePermissions',
            'roles.rolePermissions.permission',
            'organization',
          ],
          withDeleted: false,
        });

        if (!user) {
          const message = await translationService.translate(
            'user.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        return this.mapToResponseWithPermissionDescriptionsDto(user);
      },

      async update(id: string, updateUserDto: any, userId?: string) {
        const user = await userRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          relations: [
            'roles',
            'roles.rolePermissions',
            'roles.rolePermissions.permission',
            'organization',
          ],
          withDeleted: false,
        });

        if (!user) {
          const message = await translationService.translate(
            'user.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        if (updateUserDto.password) {
          updateUserDto.password = await hash(updateUserDto.password, 10);
        }

        if (updateUserDto.role_ids) {
          const roles = await Promise.all(
            updateUserDto.role_ids.map((roleId: string) => roleService.findOneEntity(roleId))
          );
          user.roles = roles;
        }

        const updatedEntity = userRepository.merge(user, updateUserDto);
        const updatedUser = await userRepository.save(updatedEntity);
        return this.mapToResponseDto(updatedUser);
      },

      async remove(id: string, userId?: string) {
        const user = await userRepository.findOne({
          where: { id, organization_id: tenantContext.getOrganizationId() },
          withDeleted: false,
        });

        if (!user) {
          const message = await translationService.translate(
            'user.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        await userRepository.softRemove(user);
      },

      async findByEmail(email: string, userId?: string) {
        const user = await userRepository.findOne({
          where: { email },
          relations: [
            'roles',
            'roles.rolePermissions',
            'roles.rolePermissions.permission',
            'organization',
          ],
          withDeleted: false,
        });

        if (!user) {
          const message = await translationService.translate(
            'user.email_not_found',
            userId,
            { email },
          );
          throw new NotFoundException(message);
        }

        return user;
      },

      async findByEmailForAuth(email: string) {
        return await userRepository.findOne({
          where: { email },
          relations: [
            'roles',
            'roles.rolePermissions',
            'roles.rolePermissions.permission',
            'organization',
          ],
          withDeleted: false,
        });
      },

      async findOneWithPermissions(id: string, userId?: string) {
        const user = await userRepository.findOne({
          where: { id },
          relations: [
            'roles',
            'roles.rolePermissions',
            'roles.rolePermissions.permission',
            'organization',
          ],
          withDeleted: false,
        });

        if (!user) {
          const message = await translationService.translate(
            'user.not_found',
            userId,
            { id },
          );
          throw new NotFoundException(message);
        }

        return user;
      },

      async findByEmailWithPermissions(email: string, userId?: string) {
        const user = await userRepository.findOne({
          where: { email },
          relations: [
            'roles',
            'roles.rolePermissions',
            'roles.rolePermissions.permission',
          ],
          withDeleted: false,
        });

        if (!user) {
          const message = await translationService.translate(
            'user.email_not_found',
            userId,
            { email },
          );
          throw new NotFoundException(message);
        }

        return user;
      },

      async getUserPermissions(id: string, userId?: string) {
        const user = await this.findOneWithPermissions(id, userId);
        return user.getPermissions();
      },

      async getUserPermissionCodes(id: string, userId?: string) {
        const user = await this.findOneWithPermissions(id, userId);
        return user.getPermissionCodes();
      },

      async userHasPermission(id: string, permissionCode: string, userId?: string) {
        const user = await this.findOneWithPermissions(id, userId);
        return user.hasPermission(permissionCode);
      },

      async userHasAnyPermission(id: string, permissionCodes: string[], userId?: string) {
        const user = await this.findOneWithPermissions(id, userId);
        return user.hasAnyPermission(permissionCodes);
      },

      async userHasAllPermissions(id: string, permissionCodes: string[], userId?: string) {
        const user = await this.findOneWithPermissions(id, userId);
        return user.hasAllPermissions(permissionCodes);
      },

      async findUnverifiedOlderThan(date: Date) {
        return await userRepository
          .createQueryBuilder('user')
          .where('user.status = :status', { status: false })
          .andWhere('user.created_at <= :date', { date })
          .getMany();
      },

      async hardDelete(id: string) {
        await userRepository.delete(id);
      },

      async completeOnboarding(userId: string) {
        await userRepository.update(userId, { onboarding_completed: true });
      },

      async getOnboardingStatus(userId: string) {
        const user = await userRepository.findOne({ where: { id: userId } });
        return user?.onboarding_completed || false;
      },

      async sendMessage(userId: string, message: string, senderUserId: string) {
        const user = await userRepository.findOne({
          where: { id: userId },
          relations: ['organization'],
          withDeleted: false,
        });

        if (!user) {
          const msg = await translationService.translate(
            'user.not_found',
            senderUserId,
            { id: userId },
          );
          throw new NotFoundException(msg);
        }

        const sender = await userRepository.findOne({
          where: { id: senderUserId },
        });

        try {
          const htmlContent = this.buildAdminMessageHtml(
            user.name,
            message,
            sender?.name || 'Administrador de Nitro',
            user.organization?.name || 'Nitro',
          );

          await emailService.sendSystemEmail(
            user.email,
            `Mensaje de ${sender?.name || 'Administrador'} - Nitro`,
            htmlContent,
          );
        } catch (error) {
          console.error(`Failed to send email to user ${userId}: ${error.message}`);
        }

        try {
          await notificationService.create({
            title: `Mensaje de ${sender?.name || 'Administrador'}`,
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            type: 'ADMIN_MESSAGE',
            priority: 'HIGH',
            userId: userId,
            organization_id: user.organization_id,
            actionUrl: '#',
            actionLabel: 'Ver mensaje',
            metadata: {
              type: 'admin_message',
              message: message,
              sentBy: senderUserId,
              sentByName: sender?.name || 'Admin',
            },
          }, userId);
        } catch (notificationError) {
          console.error('Failed to create notification:', notificationError);
          throw notificationError;
        }
      },

      mapToResponseDto(user: any) {
        const { id, name, email, roles, status, admin, created_at, organization_id, organization } = user;
        return {
          id,
          name,
          email,
          organization_id,
          organization_slug: organization?.slug,
          roles: roles?.map((role: any) => ({
            id: role.id,
            code: role.code,
            description: role.description,
            status: role.status,
            created_at: role.created_at,
          })) || [],
          permissions: user.getPermissionCodes ? user.getPermissionCodes() : [],
          status,
          admin,
          created_at,
        };
      },

      mapToResponseWithPermissionDescriptionsDto(user: any) {
        const { id, name, email, roles, status, admin, created_at, organization_id, organization } = user;
        return {
          id,
          name,
          email,
          organization_id,
          organization_slug: organization?.slug,
          roles: roles?.map((role: any) => ({
            id: role.id,
            code: role.code,
            description: role.description,
            status: role.status,
            created_at: role.created_at,
          })) || [],
          permission_descriptions: user.getPermissionDescriptions ? user.getPermissionDescriptions() : [],
          status,
          admin,
          created_at,
        };
      },

      buildAdminMessageHtml(userName: string, message: string, senderName: string, organizationName: string) {
        const timestamp = new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">💬 Nuevo mensaje</h1>
              <p style="color: #dbeafe; margin: 8px 0 0; font-size: 13px;">De: ${senderName}</p>
            </div>
            
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 32px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Hola ${userName},</p>
              
              <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="color: #111827; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${this.escapeHtml(message)}</p>
              </div>
              
              <p style="color: #6b7280; font-size: 12px; margin: 24px 0 0;">
                <strong>Enviado por:</strong> ${senderName}<br>
                <strong>Organización:</strong> ${organizationName}<br>
                <strong>Fecha:</strong> ${timestamp}
              </p>
            </div>

            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 16px 32px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                Este es un mensaje enviado desde el panel de administración de Nitro.
              </p>
            </div>
          </div>
        `;
      },

      escapeHtml(text: string) {
        const map: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
      },
    };
  });

  describe('create', () => {
    const createUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role_ids: ['role-1'],
    };

    it('should create a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        ...createUserDto,
        organization_id: 'org-123',
        created_at: new Date(),
        getPermissionCodes: jest.fn().mockReturnValue(['read']),
      };

      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      userRepository.findOne.mockResolvedValue(null);
      roleService.findOneEntity.mockResolvedValue({ id: 'role-1' });

      const result = await service.create(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createUserDto,
          organization_id: 'org-123',
        })
      );
      expect(result).toEqual(service.mapToResponseDto(mockUser));
    });

    it('should throw error if name is missing', async () => {
      const invalidDto = { ...createUserDto, name: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if email is missing', async () => {
      const invalidDto = { ...createUserDto, email: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if email already exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
    });

    it('should hash password if provided', async () => {
      const mockUser = {
        id: 'user-123',
        ...createUserDto,
        organization_id: 'org-123',
        created_at: new Date(),
        getPermissionCodes: jest.fn().mockReturnValue(['read']),
      };

      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      userRepository.findOne.mockResolvedValue(null);
      roleService.findOneEntity.mockResolvedValue({ id: 'role-1' });

      await service.create(createUserDto);

      // Check that the password was hashed by checking the saved user
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.stringMatching(/^\$2[aby]\$\d+\$/), // bcrypt hash pattern
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const paginationDto = { page: 1, limit: 10 };
      const mockUsers = [
        {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
          getPermissionCodes: jest.fn().mockReturnValue(['read']),
        },
        {
          id: 'user-2',
          name: 'User 2',
          email: 'user2@example.com',
          getPermissionCodes: jest.fn().mockReturnValue(['write']),
        },
      ];

      userRepository.findAndCount.mockResolvedValue([mockUsers, 2]);

      const result = await service.findAll(paginationDto);

      expect(userRepository.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: 'org-123' },
        relations: [
          'roles',
          'roles.rolePermissions',
          'roles.rolePermissions.permission',
          'organization',
        ],
        withDeleted: false,
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      userRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(userRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });
  });

  describe('findOne', () => {
    const userId = 'user-123';

    it('should return user by ID', async () => {
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        getPermissionCodes: jest.fn().mockReturnValue(['read']),
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId, organization_id: 'org-123' },
        relations: [
          'roles',
          'roles.rolePermissions',
          'roles.rolePermissions.permission',
          'organization',
        ],
        withDeleted: false,
      });
      expect(result).toEqual(service.mapToResponseDto(mockUser));
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('User not found');

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const updateUserDto = {
      name: 'Updated User',
      email: 'updated@example.com',
    };

    it('should update user successfully', async () => {
      const existingUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        getPermissionCodes: jest.fn().mockReturnValue(['read']),
      };

      const updatedUser = {
        ...existingUser,
        ...updateUserDto,
      };

      userRepository.findOne.mockResolvedValue(existingUser);
      userRepository.merge.mockReturnValue(updatedUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId, organization_id: 'org-123' },
        relations: [
          'roles',
          'roles.rolePermissions',
          'roles.rolePermissions.permission',
          'organization',
        ],
        withDeleted: false,
      });
      expect(result).toEqual(service.mapToResponseDto(updatedUser));
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('User not found');

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(NotFoundException);
    });

    it('should hash password if provided', async () => {
      const dtoWithPassword = { ...updateUserDto, password: 'newpassword' };
      const existingUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        getPermissionCodes: jest.fn().mockReturnValue(['read']),
      };

      userRepository.findOne.mockResolvedValue(existingUser);
      userRepository.merge.mockReturnValue(existingUser);
      userRepository.save.mockResolvedValue(existingUser);

      await service.update(userId, dtoWithPassword);

      expect(userRepository.merge).toHaveBeenCalledWith(
        existingUser,
        expect.objectContaining({
          password: expect.stringMatching(/^\$2[aby]\$\d+\$/),
        })
      );
    });
  });

  describe('remove', () => {
    const userId = 'user-123';

    it('should remove user successfully', async () => {
      const mockUser = { id: userId, name: 'Test User' };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.softRemove.mockResolvedValue(undefined);

      await service.remove(userId);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId, organization_id: 'org-123' },
        withDeleted: false,
      });
      expect(userRepository.softRemove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('User not found');

      await expect(service.remove(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    const email = 'test@example.com';

    it('should return user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: email,
        name: 'Test User',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: [
          'roles',
          'roles.rolePermissions',
          'roles.rolePermissions.permission',
          'organization',
        ],
        withDeleted: false,
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('User not found');

      await expect(service.findByEmail(email)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmailForAuth', () => {
    const email = 'test@example.com';

    it('should return user by email for authentication', async () => {
      const mockUser = {
        id: 'user-123',
        email: email,
        name: 'Test User',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmailForAuth(email);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: [
          'roles',
          'roles.rolePermissions',
          'roles.rolePermissions.permission',
          'organization',
        ],
        withDeleted: false,
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmailForAuth(email);

      expect(result).toBeNull();
    });
  });

  describe('getUserPermissions', () => {
    const userId = 'user-123';

    it('should return user permissions', async () => {
      const mockUser = {
        id: userId,
        getPermissions: jest.fn().mockReturnValue(['read', 'write']),
      };

      jest.spyOn(service, 'findOneWithPermissions').mockResolvedValue(mockUser);

      const result = await service.getUserPermissions(userId);

      expect(result).toEqual(['read', 'write']);
    });
  });

  describe('getUserPermissionCodes', () => {
    const userId = 'user-123';

    it('should return user permission codes', async () => {
      const mockUser = {
        id: userId,
        getPermissionCodes: jest.fn().mockReturnValue(['read', 'write']),
      };

      jest.spyOn(service, 'findOneWithPermissions').mockResolvedValue(mockUser);

      const result = await service.getUserPermissionCodes(userId);

      expect(result).toEqual(['read', 'write']);
    });
  });

  describe('userHasPermission', () => {
    const userId = 'user-123';
    const permissionCode = 'read';

    it('should return true if user has permission', async () => {
      const mockUser = {
        id: userId,
        hasPermission: jest.fn().mockReturnValue(true),
      };

      jest.spyOn(service, 'findOneWithPermissions').mockResolvedValue(mockUser);

      const result = await service.userHasPermission(userId, permissionCode);

      expect(result).toBe(true);
      expect(mockUser.hasPermission).toHaveBeenCalledWith(permissionCode);
    });

    it('should return false if user does not have permission', async () => {
      const mockUser = {
        id: userId,
        hasPermission: jest.fn().mockReturnValue(false),
      };

      jest.spyOn(service, 'findOneWithPermissions').mockResolvedValue(mockUser);

      const result = await service.userHasPermission(userId, permissionCode);

      expect(result).toBe(false);
    });
  });

  describe('completeOnboarding', () => {
    const userId = 'user-123';

    it('should complete user onboarding', async () => {
      userRepository.update.mockResolvedValue(undefined);

      await service.completeOnboarding(userId);

      expect(userRepository.update).toHaveBeenCalledWith(userId, { onboarding_completed: true });
    });
  });

  describe('getOnboardingStatus', () => {
    const userId = 'user-123';

    it('should return true if onboarding is completed', async () => {
      userRepository.findOne.mockResolvedValue({ onboarding_completed: true });

      const result = await service.getOnboardingStatus(userId);

      expect(result).toBe(true);
    });

    it('should return false if onboarding is not completed', async () => {
      userRepository.findOne.mockResolvedValue({ onboarding_completed: false });

      const result = await service.getOnboardingStatus(userId);

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.getOnboardingStatus(userId);

      expect(result).toBe(false);
    });
  });

  describe('sendMessage', () => {
    const userId = 'user-123';
    const senderUserId = 'sender-123';
    const message = 'Test message';

    it('should send message successfully', async () => {
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        organization_id: 'org-123',
        organization: { name: 'Test Org' },
      };

      const mockSender = {
        id: senderUserId,
        name: 'Sender Name',
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for recipient
        .mockResolvedValueOnce(mockSender); // Second call for sender

      emailService.sendSystemEmail.mockResolvedValue(undefined);
      notificationService.create.mockResolvedValue(undefined);

      await service.sendMessage(userId, message, senderUserId);

      expect(emailService.sendSystemEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Mensaje de Sender Name - Nitro',
        expect.stringContaining('Test message')
      );
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Mensaje de Sender Name',
          message: 'Test message',
          type: 'ADMIN_MESSAGE',
          priority: 'HIGH',
          userId: userId,
        }),
        userId
      );
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      translationService.translate.mockResolvedValue('User not found');

      await expect(service.sendMessage(userId, message, senderUserId)).rejects.toThrow(NotFoundException);
    });

    it('should handle email sending failure gracefully', async () => {
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        organization_id: 'org-123',
        organization: { name: 'Test Org' },
      };

      const mockSender = {
        id: senderUserId,
        name: 'Sender Name',
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockSender);

      emailService.sendSystemEmail.mockRejectedValue(new Error('Email failed'));
      notificationService.create.mockResolvedValue(undefined);

      // Should not throw error
      await expect(service.sendMessage(userId, message, senderUserId)).resolves.toBeUndefined();
    });

    it('should throw error if notification creation fails', async () => {
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        organization_id: 'org-123',
        organization: { name: 'Test Org' },
      };

      const mockSender = {
        id: senderUserId,
        name: 'Sender Name',
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockSender);

      emailService.sendSystemEmail.mockResolvedValue(undefined);
      notificationService.create.mockRejectedValue(new Error('Notification failed'));

      await expect(service.sendMessage(userId, message, senderUserId)).rejects.toThrow('Notification failed');
    });
  });

  describe('findUnverifiedOlderThan', () => {
    it('should return unverified users older than specified date', async () => {
      const date = new Date('2024-01-01');
      const mockUsers = [
        { id: 'user-1', name: 'User 1', status: false, created_at: new Date('2023-12-01') },
        { id: 'user-2', name: 'User 2', status: false, created_at: new Date('2023-11-01') },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findUnverifiedOlderThan(date);

      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.status = :status', { status: false });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.created_at <= :date', { date });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('hardDelete', () => {
    const userId = 'user-123';

    it('should hard delete user', async () => {
      userRepository.delete.mockResolvedValue(undefined);

      await service.hardDelete(userId);

      expect(userRepository.delete).toHaveBeenCalledWith(userId);
    });
  });
});
