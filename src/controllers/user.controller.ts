import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/user/create-user.dto';
import { UpdateUserDto } from '../dtos/user/update-user.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto, @UserId() userId: string) {
    return this.userService.create(createUserDto, userId);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto, @UserId() userId: string) {
    return this.userService.findAll(paginationDto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.userService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UserId() userId: string,
  ) {
    return this.userService.update(id, updateUserDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @UserId() userId: string) {
    return this.userService.remove(id, userId);
  }

  @Get(':id/permissions')
  getUserPermissions(@Param('id') id: string, @UserId() userId: string) {
    return this.userService.getUserPermissions(id, userId);
  }

  @Get(':id/permission-codes')
  getUserPermissionCodes(@Param('id') id: string, @UserId() userId: string) {
    return this.userService.getUserPermissionCodes(id, userId);
  }

  @Get(':id/has-permission/:permissionCode')
  userHasPermission(
    @Param('id') id: string,
    @Param('permissionCode') permissionCode: string,
    @UserId() userId: string,
  ) {
    return this.userService.userHasPermission(id, permissionCode, userId);
  }

  @Post(':id/has-any-permission')
  userHasAnyPermission(
    @Param('id') id: string,
    @Body() body: { permissionCodes: string[] },
    @UserId() userId: string,
  ) {
    return this.userService.userHasAnyPermission(
      id,
      body.permissionCodes,
      userId,
    );
  }

  @Post(':id/has-all-permissions')
  userHasAllPermissions(
    @Param('id') id: string,
    @Body() body: { permissionCodes: string[] },
    @UserId() userId: string,
  ) {
    return this.userService.userHasAllPermissions(
      id,
      body.permissionCodes,
      userId,
    );
  }
}
