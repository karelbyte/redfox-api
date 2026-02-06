import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ExpenseCategoryService } from '../services/expense-category.service';
import { CreateExpenseCategoryDto } from '../dtos/expense-category/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../dtos/expense-category/update-expense-category.dto';
import { AuthGuard } from '../guards/auth.guard';

@Controller('expense-categories')
@UseGuards(AuthGuard)
export class ExpenseCategoryController {
  constructor(private readonly expenseCategoryService: ExpenseCategoryService) {}

  @Post()
  create(@Body() createExpenseCategoryDto: CreateExpenseCategoryDto) {
    return this.expenseCategoryService.create(createExpenseCategoryDto);
  }

  @Get()
  findAll() {
    return this.expenseCategoryService.findAll();
  }

  @Get('stats')
  getExpensesByCategory() {
    return this.expenseCategoryService.getExpensesByCategory();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseCategoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExpenseCategoryDto: UpdateExpenseCategoryDto) {
    return this.expenseCategoryService.update(+id, updateExpenseCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseCategoryService.remove(+id);
  }
}