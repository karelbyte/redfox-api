import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
  IsPositive,
  Length,
  IsUUID,
} from 'class-validator';
import { ExpenseStatus, ExpenseRecurrence } from '../../models/expense.entity';

export class CreateExpenseDto {
  @IsString()
  @Length(1, 100)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsDateString()
  expenseDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsEnum(ExpenseRecurrence)
  recurrence?: ExpenseRecurrence;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  reference?: string;

  @IsUUID()
  categoryId: string;
}
