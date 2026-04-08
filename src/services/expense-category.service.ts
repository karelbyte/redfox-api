import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseCategory } from '../models/expense-category.entity';
import { CreateExpenseCategoryDto } from '../dtos/expense-category/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../dtos/expense-category/update-expense-category.dto';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class ExpenseCategoryService {
  constructor(
    @InjectRepository(ExpenseCategory)
    private expenseCategoryRepository: Repository<ExpenseCategory>,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  async create(
    createExpenseCategoryDto: CreateExpenseCategoryDto,
  ): Promise<ExpenseCategory> {
    const expenseCategory = this.expenseCategoryRepository.create({
      ...createExpenseCategoryDto,
      organization_id: this.organizationId,
    });
    return await this.expenseCategoryRepository.save(expenseCategory);
  }

  async findAll(): Promise<ExpenseCategory[]> {
    const categories = await this.expenseCategoryRepository.find({
      where: {
        isActive: true,
        organization_id: this.organizationId,
      },
      order: { name: 'ASC' },
    });

    if (categories.length === 0) {
      await this.seedDefaultCategories(this.organizationId);
      return await this.expenseCategoryRepository.find({
        where: {
          isActive: true,
          organization_id: this.organizationId,
        },
        order: { name: 'ASC' },
      });
    }

    return categories;
  }

  private async seedDefaultCategories(organizationId: string): Promise<void> {
    const existingCount = await this.expenseCategoryRepository.count({
      where: { organization_id: organizationId },
    });

    if (existingCount > 0) {
      return;
    }

    const defaultCategories = [
      {
        name: 'Office Supplies',
        description: 'Office materials and supplies',
        color: '#3B82F6',
      },
      {
        name: 'Utilities',
        description: 'Electricity, water, internet, phone',
        color: '#EF4444',
      },
      {
        name: 'Rent',
        description: 'Office and warehouse rent',
        color: '#10B981',
      },
      {
        name: 'Marketing',
        description: 'Advertising and marketing expenses',
        color: '#F59E0B',
      },
      {
        name: 'Travel',
        description: 'Business travel and transportation',
        color: '#8B5CF6',
      },
      {
        name: 'Professional Services',
        description: 'Legal, accounting, consulting',
        color: '#06B6D4',
      },
      {
        name: 'Equipment',
        description: 'Office equipment and machinery',
        color: '#84CC16',
      },
      {
        name: 'Insurance',
        description: 'Business insurance premiums',
        color: '#F97316',
      },
      {
        name: 'Maintenance',
        description: 'Equipment and facility maintenance',
        color: '#EC4899',
      },
      {
        name: 'Other',
        description: 'Miscellaneous expenses',
        color: '#6B7280',
      },
    ];

    const categoriesToSave = defaultCategories.map((cat) =>
      this.expenseCategoryRepository.create({
        ...cat,
        organization_id: organizationId,
        isActive: true,
      }),
    );

    await this.expenseCategoryRepository.save(categoriesToSave);
  }

  async findOne(id: string): Promise<ExpenseCategory> {
    const expenseCategory = await this.expenseCategoryRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['expenses'],
    });

    if (!expenseCategory) {
      throw new NotFoundException(`Expense category with ID ${id} not found`);
    }

    return expenseCategory;
  }

  async update(
    id: string,
    updateExpenseCategoryDto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategory> {
    const expenseCategory = await this.findOne(id);
    Object.assign(expenseCategory, updateExpenseCategoryDto);
    return await this.expenseCategoryRepository.save(expenseCategory);
  }

  async remove(id: string): Promise<ExpenseCategory> {
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
        'COALESCE(SUM(expense.amount), 0) as totalAmount',
      ])
      .where('category.isActive = :isActive', { isActive: true })
      .andWhere('category.organization_id = :organizationId', {
        organizationId: this.organizationId,
      })
      .groupBy('category.id')
      .getRawMany();
  }
}
