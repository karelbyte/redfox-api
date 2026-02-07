import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { BookmarkService } from '../services/bookmark.service';
import { CreateBookmarkDto } from '../dtos/bookmark/create-bookmark.dto';
import { UserId } from '../decorators/user-id.decorator';

@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarkController {
  constructor(private bookmarkService: BookmarkService) {}

  @Post()
  async create(
    @UserId() userId: string,
    @Body() createBookmarkDto: CreateBookmarkDto,
  ) {
    return this.bookmarkService.create(
      userId,
      createBookmarkDto.entityType,
      createBookmarkDto.entityId,
      createBookmarkDto.entityName,
      createBookmarkDto.description,
    );
  }

  @Get()
  async findByUser(
    @UserId() userId: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.bookmarkService.findByUser(userId, entityType);
  }

  @Get('check/:entityType/:entityId')
  async isBookmarked(
    @UserId() userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const isBookmarked = await this.bookmarkService.isBookmarked(
      userId,
      entityType,
      entityId,
    );
    return { isBookmarked };
  }

  @Delete(':entityType/:entityId')
  async remove(
    @UserId() userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    await this.bookmarkService.remove(userId, entityType, entityId);
    return { success: true };
  }
}
