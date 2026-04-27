import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserAttributionService } from '../services/user-attribution.service';
import { CreateUserAttributionDto } from '../dtos/user-attribution/create-user-attribution.dto';
import { AssignAttributionsDto } from '../dtos/user-attribution/assign-attributions.dto';
import { UpdateUserAttributionDto } from '../dtos/user-attribution/update-user-attribution.dto';
import { UserAttributionResponseDto } from '../dtos/user-attribution/user-attribution-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('user-attributions')
@UseGuards(AuthGuard)
export class UserAttributionController {
  constructor(
    private readonly userAttributionService: UserAttributionService,
  ) {}

  @Post()
  async create(
    @Body() createUserAttributionDto: CreateUserAttributionDto,
    @UserId() userId: string,
  ): Promise<UserAttributionResponseDto> {
    return this.userAttributionService.create(createUserAttributionDto, userId);
  }

  @Post('assign')
  async assignAttributions(
    @Body() assignAttributionsDto: AssignAttributionsDto,
    @UserId() userId: string,
  ): Promise<UserAttributionResponseDto[]> {
    return this.userAttributionService.assignAttributions(
      assignAttributionsDto,
      userId,
    );
  }

  @Get()
  async findAll(
    @UserId() userId: string,
  ): Promise<UserAttributionResponseDto[]> {
    return this.userAttributionService.findAll(userId);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @UserId() currentUserId: string,
    @Query('attributionType') attributionType?: string,
  ): Promise<UserAttributionResponseDto[]> {
    return this.userAttributionService.findByUser(
      userId,
      attributionType,
      currentUserId,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<UserAttributionResponseDto> {
    return this.userAttributionService.findOne(id, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserAttributionDto: UpdateUserAttributionDto,
    @UserId() userId: string,
  ): Promise<UserAttributionResponseDto> {
    return this.userAttributionService.update(id, updateUserAttributionDto, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.userAttributionService.remove(id, userId);
  }
}
