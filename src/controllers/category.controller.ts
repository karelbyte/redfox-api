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
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dtos/category/create-category.dto';
import { UpdateCategoryDto } from '../dtos/category/update-category.dto';
import { CategoryResponseDto } from '../dtos/category/category-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';

@Controller('categories')
@UseGuards(AuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    return this.categoryService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoryService.findOne(id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoryService.findBySlug(slug);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.categoryService.remove(id);
  }

  @Get('parent/:id')
  async findByParentId(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    return this.categoryService.findByParentId(id, paginationDto);
  }
}
