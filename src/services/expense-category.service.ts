import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseCategory } from '../models/expense-category.entity';
import { CreateExpenseCategoryDto } from '../dtos/expense-category/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../dtos/expense-category/update-expense-category.dto';

@Injectable()
export class ExpenseCategoryService {
  constructor(
    @InjectRepository(ExpenseCategory)
    private expenseCategoryRepository: Repository<ExpenseCategory>,
  ) {}

  async create(createExpenseCategoryDto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    const expenseCategory = this.expenseCategoryRepository.create(createExpenseCategoryDto);
    return await this.expenseCategoryRepository.save(expenseCategory);
  }

  async findAll(): Promise<ExpenseCategory[]> {
    return await this.expenseCategoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ExpenseCategory> {
    const expenseCategory = await this.expenseCategoryRepository.findOne({
      where: { id },
      relations: ['expenses'],
    });

    if (!expenseCategory) {
      throw new NotFoundException(`Expense category with ID ${id} not found`);
    }

    return expenseCategory;
  }

  async update(id: number, updateExpenseCategoryDto: UpdateExpenseCategoryDto): Promise<ExpenseCategory> {
    const expenseCategory = await this.findOne(id);
    Object.assign(expenseCategory, updateExpenseCategoryDto);
    return await this.expenseCategoryRepository.save(expenseCategory);
  }

  async remove(id: number): Promise<ExpenseCategory> {
    const expenseCategory = await this.findOne(id);
    expenseCategory.isActive = false;
    return await this.expenseCategoryRepository.save(expenseCategory);
  }

  async getExpensesByCategory(): Promise<any[]> {
    return await this.expenseCategoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.expenses', 'expense')
      .select([
        'category.id',
        'category.name',
        'category.color',
        'COUNT(expense.id) as expenseCount',
        'COALESCE(SUM(expense.amount), 0) as totalAmount'
      ])
      .where('category.isActive = :isActive', { isActive: true })
      .groupBy('category.id')
      .getRawMany();
  }
}