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
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dtos/notification/create-notification.dto';
import { UpdateNotificationDto } from '../dtos/notification/update-notification.dto';
import { NotificationQueryDto } from '../dtos/notification/notification-query.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(
    @Body() createNotificationDto: CreateNotificationDto,
    @UserId() userId: string,
  ) {
    return this.notificationService.create(createNotificationDto, userId);
  }

  @Get()
  findAll(
    @Query() query: NotificationQueryDto,
    @UserId() userId: string,
  ) {
    return this.notificationService.findAll(query, userId);
  }

  @Get('unread-count')
  getUnreadCount(@UserId() userId: string) {
    return this.notificationService.getUnreadCount(userId).then(count => ({ count }));
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @UserId() userId: string,
  ) {
    return this.notificationService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @UserId() userId: string,
  ) {
    return this.notificationService.update(id, updateNotificationDto, userId);
  }

  @Patch('mark-all-read')
  markAllAsRead(@UserId() userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete('read')
  deleteAllRead(@UserId() userId: string) {
    return this.notificationService.deleteAllRead(userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ) {
    return this.notificationService.remove(id, userId);
  }
}