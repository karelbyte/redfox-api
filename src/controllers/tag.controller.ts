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
import { AuthGuard } from '../guards/auth.guard';
import { TagService } from '../services/tag.service';
import { CreateTagDto } from '../dtos/tag/create-tag.dto';
import { UpdateTagDto } from '../dtos/tag/update-tag.dto';
import { UserId } from '../decorators/user-id.decorator';

@Controller('tags')
@UseGuards(AuthGuard)
export class TagController {
  constructor(private tagService: TagService) {}

  @Post()
  async create(@UserId() userId: string, @Body() createTagDto: CreateTagDto) {
    return this.tagService.create(
      userId,
      createTagDto.name,
      createTagDto.entityType,
      createTagDto.color,
    );
  }

  @Get()
  async findByUser(
    @UserId() userId: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.tagService.findByUser(userId, entityType);
  }

  @Get('search/:entityType')
  async search(
    @UserId() userId: string,
    @Param('entityType') entityType: string,
    @Query('term') term: string = '',
  ) {
    return this.tagService.search(userId, entityType, term);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.tagService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagService.update(id, updateTagDto.name, updateTagDto.color);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tagService.remove(id);
    return { success: true };
  }
}
