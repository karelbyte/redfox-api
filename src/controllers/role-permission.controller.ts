import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RolePermissionService } from '../services/role-permission.service';
import {
  CreateRolePermissionDto,
  AssignPermissionsToRoleDto,
} from '../dtos/role-permission/create-role-permission.dto';
import { RolePermissionResponseDto } from '../dtos/role-permission/role-permission-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('role-permissions')
@UseGuards(AuthGuard)
export class RolePermissionController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  @Post()
  create(
    @Body() createRolePermissionDto: CreateRolePermissionDto,
    @UserId() userId: string,
  ): Promise<RolePermissionResponseDto> {
    return this.rolePermissionService.create(createRolePermissionDto, userId);
  }

  @Post('assign')
  assignPermissionsToRole(
    @Body()
    assignPermissionsDto: AssignPermissionsToRoleDto,
    @UserId() userId: string,
  ): Promise<RolePermissionResponseDto[]> {
    return this.rolePermissionService.assignPermissionsToRole(
      assignPermissionsDto,
      userId,
    );
  }

  @Put('role/:roleId')
  updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() updateRolePermissionsDto: { permissionIds: string[] },
    @UserId() userId: string,
  ): Promise<RolePermissionResponseDto[]> {
    return this.rolePermissionService.updateRolePermissions(
      roleId,
      updateRolePermissionsDto.permissionIds,
      userId,
    );
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
  findOne(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<RolePermissionResponseDto> {
    return this.rolePermissionService.findOne(id, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.rolePermissionService.remove(id, userId);
  }

  @Delete('role/:roleId/permission/:permissionId')
  removeByRoleAndPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.rolePermissionService.removeByRoleAndPermission(
      roleId,
      permissionId,
      userId,
    );
  }
}
