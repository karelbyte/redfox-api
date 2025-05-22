import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/user/create-user.dto';
import { UpdateUserDto } from '../dtos/user/update-user.dto';
import { UserResponseDto } from '../dtos/user/user-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return this.userService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
