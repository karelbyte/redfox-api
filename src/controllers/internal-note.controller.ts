import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { InternalNoteService } from '../services/internal-note.service';
import { CreateInternalNoteDto } from '../dtos/internal-note/create-internal-note.dto';
import { UpdateInternalNoteDto } from '../dtos/internal-note/update-internal-note.dto';
import { UserId } from '../decorators/user-id.decorator';

@Controller('internal-notes')
@UseGuards(AuthGuard)
export class InternalNoteController {
  constructor(private internalNoteService: InternalNoteService) {}

  @Post()
  async create(
    @UserId() userId: string,
    @Body() createNoteDto: CreateInternalNoteDto,
  ) {
    return this.internalNoteService.create(
      userId,
      createNoteDto.entityType,
      createNoteDto.entityId,
      createNoteDto.content,
      createNoteDto.color,
    );
  }

  @Get(':entityType/:entityId')
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.internalNoteService.findByEntity(entityType, entityId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateInternalNoteDto,
  ) {
    return this.internalNoteService.update(
      id,
      updateNoteDto.content,
      updateNoteDto.color,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.internalNoteService.remove(id);
    return { success: true };
  }
}
