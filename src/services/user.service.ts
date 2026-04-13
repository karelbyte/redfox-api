import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { CreateUserDto } from '../dtos/user/create-user.dto';
import { UpdateUserDto } from '../dtos/user/update-user.dto';
import {
  UserResponseDto,
  UserWithPermissionDescriptionsDto,
} from '../dtos/user/user-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { RoleService } from './role.service';
import { TranslationService } from './translation.service';
import { UserContextService } from './user-context.service';
import { TenantContext } from './tenant-context.service';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { NotificationType, NotificationPriority } from '../models/notification.entity';
import { hash } from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private roleService: RoleService,
    private translationService: TranslationService,
    private readonly tenantContext: TenantContext,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await hash(password, saltRounds);
  }

  private mapToResponseDto(user: User): UserResponseDto {
    const {
      id,
      name,
      email,
      roles,
      status,
      created_at,
      organization_id,
      organization,
    } = user;
    return {
      id,
      name,
      email,
      organization_id,
      organization_slug: organization?.slug,
      roles:
        roles?.map((role) => ({
          id: role.id,
          code: role.code,
          description: role.description,
          status: role.status,
          created_at: role.created_at,
        })) || [],
      permissions: user.getPermissionCodes(),
      status,
      created_at,
    };
  }

  private mapToResponseWithPermissionDescriptionsDto(
    user: User,
  ): UserWithPermissionDescriptionsDto {
    const {
      id,
      name,
      email,
      roles,
      status,
      created_at,
      organization_id,
      organization,
    } = user;
    return {
      id,
      name,
      email,
      organization_id,
      organization_slug: organization?.slug,
      roles:
        roles?.map((role) => ({
          id: role.id,
          code: role.code,
          description: role.description,
          status: role.status,
          created_at: role.created_at,
        })) || [],
      permission_descriptions: user.getPermissionDescriptions(),
      status,
      created_at,
    };
  }

  async create(
    createUserDto: CreateUserDto,
    userId?: string,
  ): Promise<UserResponseDto> {
    const user = this.userRepository.create({
      ...createUserDto,
      organization_id: this.organizationId,
    });

    if (createUserDto.password) {
      user.password = await this.hashPassword(createUserDto.password);
    }

    if (createUserDto.role_ids) {
      const roles = await Promise.all(
        createUserDto.role_ids.map((id) => this.roleService.findOneEntity(id)),
      );
      user.roles = roles;
    }

    const savedUser = await this.userRepository.save(user);
    return this.mapToResponseDto(savedUser);
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      where: { organization_id: this.organizationId },
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

    const data = users.map((user) => this.mapToResponseDto(user));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: [
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
        'organization',
      ],
      withDeleted: false,
    });

    if (!user) {
      const message = await this.translationService.translate(
        'user.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(user);
  }

  async findOneWithPermissionDescriptions(
    id: string,
    userId?: string,
  ): Promise<UserWithPermissionDescriptionsDto> {
    const user = await this.userRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: [
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
        'organization',
      ],
      withDeleted: false,
    });

    if (!user) {
      const message = await this.translationService.translate(
        'user.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseWithPermissionDescriptionsDto(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    userId?: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: [
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
        'organization',
      ],
      withDeleted: false,
    });

    if (!user) {
      const message = await this.translationService.translate(
        'user.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    if (updateUserDto.password) {
      updateUserDto.password = await this.hashPassword(updateUserDto.password);
    }

    if (updateUserDto.role_ids) {
      const roles = await Promise.all(
        updateUserDto.role_ids.map((id) => this.roleService.findOneEntity(id)),
      );
      user.roles = roles;
    }

    // Merge updates into the existing entity to preserve methods
    const updatedEntity = this.userRepository.merge(user, updateUserDto);
    const updatedUser = await this.userRepository.save(updatedEntity);
    return this.mapToResponseDto(updatedUser);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id, organization_id: this.organizationId },
      withDeleted: false,
    });

    if (!user) {
      const message = await this.translationService.translate(
        'user.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.userRepository.softRemove(user);
  }

  async findByEmail(email: string, userId?: string): Promise<User> {
    const user = await this.userRepository.findOne({
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
      const message = await this.translationService.translate(
        'user.email_not_found',
        userId,
        { email },
      );
      throw new NotFoundException(message);
    }

    return user;
  }

  /**
   * Finds a user by email for authentication purposes (doesn't throw if not found)
   * @param email - User email
   * @returns User or null if not found
   */
  async findByEmailForAuth(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: [
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
        'organization',
      ],
      withDeleted: false,
    });
  }

  /**
   * Obtiene un usuario con todos sus roles y permisos cargados
   * @param id - ID del usuario
   * @param userId - ID del usuario autenticado
   * @returns Usuario con roles y permisos
   */
  async findOneWithPermissions(id: string, userId?: string): Promise<User> {
    const user = await this.userRepository.findOne({
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
      const message = await this.translationService.translate(
        'user.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return user;
  }

  /**
   * Obtiene un usuario por email con todos sus roles y permisos cargados
   * @param email - Email del usuario
   * @param userId - ID del usuario autenticado
   * @returns Usuario con roles y permisos
   */
  async findByEmailWithPermissions(
    email: string,
    userId?: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: [
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
      ],
      withDeleted: false,
    });

    if (!user) {
      const message = await this.translationService.translate(
        'user.email_not_found',
        userId,
        { email },
      );
      throw new NotFoundException(message);
    }

    return user;
  }

  /**
   * Obtiene los permisos de un usuario desde la base de datos
   * @param id - ID del usuario
   * @param userId - ID del usuario autenticado
   * @returns Array de permisos únicos
   */
  async getUserPermissions(id: string, userId?: string): Promise<any[]> {
    const user = await this.findOneWithPermissions(id, userId);
    return user.getPermissions();
  }

  /**
   * Obtiene los códigos de permisos de un usuario desde la base de datos
   * @param id - ID del usuario
   * @param userId - ID del usuario autenticado
   * @returns Array de códigos de permisos únicos
   */
  async getUserPermissionCodes(id: string, userId?: string): Promise<string[]> {
    const user = await this.findOneWithPermissions(id, userId);
    return user.getPermissionCodes();
  }

  /**
   * Verifica si un usuario tiene un permiso específico
   * @param id - ID del usuario
   * @param permissionCode - Código del permiso a verificar
   * @param userId - ID del usuario autenticado
   * @returns true si el usuario tiene el permiso, false en caso contrario
   */
  async userHasPermission(
    id: string,
    permissionCode: string,
    userId?: string,
  ): Promise<boolean> {
    const user = await this.findOneWithPermissions(id, userId);
    return user.hasPermission(permissionCode);
  }

  /**
   * Verifica si un usuario tiene al menos uno de los permisos especificados
   * @param id - ID del usuario
   * @param permissionCodes - Array de códigos de permisos a verificar
   * @param userId - ID del usuario autenticado
   * @returns true si el usuario tiene al menos uno de los permisos, false en caso contrario
   */
  async userHasAnyPermission(
    id: string,
    permissionCodes: string[],
    userId?: string,
  ): Promise<boolean> {
    const user = await this.findOneWithPermissions(id, userId);
    return user.hasAnyPermission(permissionCodes);
  }

  /**
   * Verifica si un usuario tiene todos los permisos especificados
   * @param id - ID del usuario
   * @param permissionCodes - Array de códigos de permisos a verificar
   * @param userId - ID del usuario autenticado
   * @returns true si el usuario tiene todos los permisos, false en caso contrario
   */
  async userHasAllPermissions(
    id: string,
    permissionCodes: string[],
    userId?: string,
  ): Promise<boolean> {
    const user = await this.findOneWithPermissions(id, userId);
    return user.hasAllPermissions(permissionCodes);
  }

  async findUnverifiedOlderThan(date: Date): Promise<User[]> {
    return await this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: false })
      .andWhere('user.created_at <= :date', { date })
      .getMany();
  }

  async hardDelete(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async completeOnboarding(userId: string): Promise<void> {
    await this.userRepository.update(userId, { onboarding_completed: true });
  }

  async getOnboardingStatus(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.onboarding_completed || false;
  }

  /**
   * Sends an admin message to a user via email and internal notification
   * @param userId - ID of the user to send message to
   * @param message - Message content (10-1000 chars)
   * @param senderUserId - ID of the user sending the message (admin)
   */
  async sendMessage(
    userId: string,
    message: string,
    senderUserId: string,
  ): Promise<void> {
    // Get target user (without organization filter - admins can message any user)
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
      withDeleted: false,
    });

    if (!user) {
      const msg = await this.translationService.translate(
        'user.not_found',
        senderUserId,
        { id: userId },
      );
      throw new NotFoundException(msg);
    }

    // Get sender user
    const sender = await this.userRepository.findOne({
      where: { id: senderUserId },
    });

    try {
      // Send email with message using system email service
      const htmlContent = this.buildAdminMessageHtml(
        user.name,
        message,
        sender?.name || 'Administrador de Nitro',
        user.organization?.name || 'Nitro',
      );

      // Send email directly using system email service (not via tenant-specific queue)
      await this.emailService.sendSystemEmail(
        user.email,
        `Mensaje de ${sender?.name || 'Administrador'} - Nitro`,
        htmlContent,
      );
    } catch (error) {
      // Log error but don't fail - app continues even if email fails
      console.error(
        `Failed to send email to user ${userId}: ${error.message}`,
      );
    }

    // Always create the notification with correct organization_id
    try {
      await this.notificationService.create({
        title: `Mensaje de ${sender?.name || 'Administrador'}`,
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        type: NotificationType.ADMIN_MESSAGE,
        priority: NotificationPriority.HIGH,
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
  }

  private buildAdminMessageHtml(
    userName: string,
    message: string,
    senderName: string,
    organizationName: string,
  ): string {
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
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
