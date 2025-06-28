import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { CreateUserDto } from '../dtos/user/create-user.dto';
import { UpdateUserDto } from '../dtos/user/update-user.dto';
import { UserResponseDto } from '../dtos/user/user-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { RoleService } from './role.service';
import { TranslationService } from './translation.service';
import { UserContextService } from './user-context.service';
import { hash } from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private roleService: RoleService,
    private translationService: TranslationService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await hash(password, saltRounds);
  }

  private mapToResponseDto(user: User): UserResponseDto {
    const { id, name, email, roles, status, created_at } = user;
    return {
      id,
      name,
      email,
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

  async create(
    createUserDto: CreateUserDto,
    userId?: string,
  ): Promise<UserResponseDto> {
    const user = this.userRepository.create(createUserDto);

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
      relations: [
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
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
      where: { id },
      relations: [
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
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

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    userId?: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
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

    const updatedUser = await this.userRepository.save({
      ...user,
      ...updateUserDto,
    });
    return this.mapToResponseDto(updatedUser);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
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
}
