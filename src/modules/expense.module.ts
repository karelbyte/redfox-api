import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseService } from '../services/expense.service';
import { ExpenseController } from '../controllers/expense.controller';
import { Expense } from '../models/expense.entity';
import { ExpenseCategory } from '../models/expense-category.entity';
import { ExpenseCategoryService } from '../services/expense-category.service';
import { ExpenseCategoryController } from '../controllers/expense-category.controller';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseCategory]),
    OrganizationModule,
  ],
  controllers: [ExpenseController, ExpenseCategoryController],
  providers: [ExpenseService, ExpenseCategoryService],
  exports: [ExpenseService, ExpenseCategoryService],
})
export class ExpenseModule {}
