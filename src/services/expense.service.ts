import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense, ExpenseStatus } from '../models/expense.entity';
import { CreateExpenseDto } from '../dtos/expense/create-expense.dto';
import { UpdateExpenseDto } from '../dtos/expense/update-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) { }

  async create(createExpenseDto: CreateExpenseDto, userId: string): Promise<Expense> {
    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      createdBy: userId,
    });
    return await this.expenseRepository.save(expense);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: ExpenseStatus,
    categoryId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<{
    data: Expense[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .leftJoinAndSelect('expense.provider', 'provider')
      .leftJoinAndSelect('expense.createdByUser', 'user');

    if (search) {
      queryBuilder.andWhere(
        '(expense.description LIKE :search OR COALESCE(provider.name, \'\') LIKE :search OR expense.reference LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('expense.status = :status', { status });
    }

    if (categoryId) {
      queryBuilder.andWhere('expense.categoryId = :categoryId', { categoryId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('expense.expenseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const total = await queryBuilder.getCount();
    const expenses = await queryBuilder
      .orderBy('expense.expenseDate', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit)
      .getMany();

    return {
      data: expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['category', 'provider', 'createdByUser'],
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(id: number, updateExpenseDto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findOne(id);
    Object.assign(expense, updateExpenseDto);
    return await this.expenseRepository.save(expense);
  }

  async remove(id: number): Promise<void> {
    const expense = await this.findOne(id);
    await this.expenseRepository.remove(expense);
  }

  async removeMany(ids: number[]): Promise<void> {
    await this.expenseRepository.delete(ids);
  }

  async getExpensesSummary(startDate?: string, endDate?: string): Promise<{
    totalExpenses: number;
    paidExpenses: number;
    pendingExpenses: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  }> {
    const queryBuilder = this.expenseRepository.createQueryBuilder('expense');

    if (startDate && endDate) {
      queryBuilder.where('expense.expenseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const expenses = await queryBuilder.getMany();

    const summary = expenses.reduce(
      (acc, expense) => {
        acc.totalExpenses++;
        acc.totalAmount += Number(expense.amount);

        if (expense.status === ExpenseStatus.PAID) {
          acc.paidExpenses++;
          acc.paidAmount += Number(expense.amount);
        } else {
          acc.pendingExpenses++;
          acc.pendingAmount += Number(expense.amount);
        }

        return acc;
      },
      {
        totalExpenses: 0,
        paidExpenses: 0,
        pendingExpenses: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      }
    );

    return summary;
  }

  async getMonthlyExpenses(year: number): Promise<any[]> {
    return await this.expenseRepository
      .createQueryBuilder('expense')
      .select([
        'MONTH(expense.expenseDate) as month',
        'SUM(expense.amount) as totalAmount',
        'COUNT(expense.id) as expenseCount'
      ])
      .where('YEAR(expense.expenseDate) = :year', { year })
      .groupBy('MONTH(expense.expenseDate)')
      .orderBy('month', 'ASC')
      .getRawMany();
  }

  async getExpensesByCategory(startDate?: string, endDate?: string): Promise<any[]> {
    const queryBuilder = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoin('expense.category', 'category')
      .select([
        'category.name as categoryName',
        'category.color as categoryColor',
        'SUM(expense.amount) as totalAmount',
        'COUNT(expense.id) as expenseCount'
      ])
      .groupBy('expense.categoryId');

    if (startDate && endDate) {
      queryBuilder.where('expense.expenseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return await queryBuilder.getRawMany();
  }
}