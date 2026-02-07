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
import { TemplateService } from '../services/template.service';
import { CreateTemplateDto } from '../dtos/template/create-template.dto';
import { UpdateTemplateDto } from '../dtos/template/update-template.dto';
import { UserId } from '../decorators/user-id.decorator';

@Controller('templates')
@UseGuards(AuthGuard)
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  @Post()
  async create(
    @UserId() userId: string,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    return this.templateService.create(
      userId,
      createTemplateDto.name,
      createTemplateDto.entityType,
      createTemplateDto.data,
      createTemplateDto.description,
      createTemplateDto.isDefault,
    );
  }

  @Get()
  async findByUser(
    @UserId() userId: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.templateService.findByUser(userId, entityType);
  }

  @Get('default/:entityType')
  async findDefault(
    @UserId() userId: string,
    @Param('entityType') entityType: string,
  ) {
    return this.templateService.findDefault(userId, entityType);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.templateService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templateService.update(
      id,
      updateTemplateDto.name,
      updateTemplateDto.data,
      updateTemplateDto.description,
    );
  }

  @Post(':id/set-default')
  async setAsDefault(
    @UserId() userId: string,
    @Param('id') id: string,
    @Query('entityType') entityType: string,
  ) {
    await this.templateService.setAsDefault(userId, id, entityType);
    return { success: true };
  }

  @Post(':id/duplicate')
  async duplicate(
    @UserId() userId: string,
    @Param('id') id: string,
    @Query('newName') newName: string,
  ) {
    return this.templateService.duplicate(userId, id, newName);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.templateService.remove(id);
    return { success: true };
  }
}
