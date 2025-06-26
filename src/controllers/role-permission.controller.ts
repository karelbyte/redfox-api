import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RolePermissionService } from '../services/role-permission.service';
import { CreateRolePermissionDto } from '../dtos/role-permission/create-role-permission.dto';
import { RolePermissionResponseDto } from '../dtos/role-permission/role-permission-response.dto';
import { AuthGuard } from '../guards/auth.guard';

@Controller('role-permissions')
@UseGuards(AuthGuard)
export class RolePermissionController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  @Post()
  create(
    @Body() createRolePermissionDto: CreateRolePermissionDto,
  ): Promise<RolePermissionResponseDto> {
    return this.rolePermissionService.create(createRolePermissionDto);
  }

  @Get()
  findAll(): Promise<RolePermissionResponseDto[]> {
    return this.rolePermissionService.findAll();
  }

  @Get('role/:roleId')
  findByRoleId(
    @Param('roleId') roleId: string,
  ): Promise<RolePermissionResponseDto[]> {
    return this.rolePermissionService.findByRoleId(roleId);
  }

  @Get('permission/:permissionId')
  findByPermissionId(
    @Param('permissionId') permissionId: string,
  ): Promise<RolePermissionResponseDto[]> {
    return this.rolePermissionService.findByPermissionId(permissionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<RolePermissionResponseDto> {
    return this.rolePermissionService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.rolePermissionService.remove(id);
  }

  @Delete('role/:roleId/permission/:permissionId')
  removeByRoleAndPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ): Promise<void> {
    return this.rolePermissionService.removeByRoleAndPermission(roleId, permissionId);
  }
} 