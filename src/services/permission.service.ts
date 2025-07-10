import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../models/permission.entity';
import { CreatePermissionDto } from '../dtos/permission/create-permission.dto';
import { UpdatePermissionDto } from '../dtos/permission/update-permission.dto';
import { PermissionMapper } from './mappers/permission.mapper';
import { PermissionResponseDto } from '../dtos/permission/permission-response.dto';
import { TranslationService } from './translation.service';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private translationService: TranslationService,
  ) {}

  async create(
    createPermissionDto: CreatePermissionDto,
    userId?: string,
  ): Promise<PermissionResponseDto> {
    try {
      const existingPermission = await this.permissionRepository.findOne({
        where: { code: createPermissionDto.code },
      });

      if (existingPermission) {
        const message = await this.translationService.translate(
          'permission.already_exists',
          userId,
          { code: createPermissionDto.code },
        );
        throw new ConflictException(message);
      }

      const permission = this.permissionRepository.create({
        code: createPermissionDto.code,
        module: createPermissionDto.module,
        description: createPermissionDto.description,
      });

      const savedPermission = await this.permissionRepository.save(permission);
      return PermissionMapper.toResponseDto(savedPermission);
    } catch (error: any) {
      // Handle duplicate code error
      if (
        error?.code === 'ER_DUP_ENTRY' &&
        error?.message?.includes('permissions.UQ_')
      ) {
        const message = await this.translationService.translate(
          'permission.already_exists',
          userId,
          { code: createPermissionDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async findAll(userId?: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find();
    return PermissionMapper.toResponseDtoList(permissions);
  }

  async findOne(id: string, userId?: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      const message = await this.translationService.translate(
        'permission.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return PermissionMapper.toResponseDto(permission);
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
    userId?: string,
  ): Promise<PermissionResponseDto> {
    try {
      const permission = await this.permissionRepository.findOne({
        where: { id },
      });

      if (!permission) {
        const message = await this.translationService.translate(
          'permission.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      if (updatePermissionDto.code) {
        const existingPermission = await this.permissionRepository.findOne({
          where: { code: updatePermissionDto.code, id: { $ne: id } as any },
        });

        if (existingPermission) {
          const message = await this.translationService.translate(
            'permission.already_exists',
            userId,
            { code: updatePermissionDto.code },
          );
          throw new ConflictException(message);
        }
      }

      Object.assign(permission, updatePermissionDto);
      const updatedPermission =
        await this.permissionRepository.save(permission);

      return PermissionMapper.toResponseDto(updatedPermission);
    } catch (error: any) {
      // Handle duplicate code error in update
      if (
        error?.code === 'ER_DUP_ENTRY' &&
        error?.message?.includes('permissions.UQ_')
      ) {
        const message = await this.translationService.translate(
          'permission.already_exists',
          userId,
          { code: updatePermissionDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      const message = await this.translationService.translate(
        'permission.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.permissionRepository.softDelete(id);
  }
}
