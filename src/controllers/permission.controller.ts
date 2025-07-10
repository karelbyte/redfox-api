import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { CreatePermissionDto } from '../dtos/permission/create-permission.dto';
import { UpdatePermissionDto } from '../dtos/permission/update-permission.dto';
import { PermissionResponseDto } from '../dtos/permission/permission-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('permissions')
@UseGuards(AuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  create(
    @Body() createPermissionDto: CreatePermissionDto,
    @UserId() userId: string,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.create(createPermissionDto, userId);
  }

  @Get()
  findAll(@UserId() userId: string): Promise<PermissionResponseDto[]> {
    return this.permissionService.findAll(userId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @UserId() userId: string,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.update(id, updatePermissionDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.permissionService.remove(id, userId);
  }
}
