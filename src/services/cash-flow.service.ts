import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from '../models/expense.entity';
import { AccountReceivable, AccountReceivableStatus } from '../models/account-receivable.entity';
import { AccountPayable, AccountPayableStatus } from '../models/account-payable.entity';
import { Invoice } from '../models/invoice.entity';

export interface CashFlowSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  accountsReceivableAmount: number;
  accountsPayableAmount: number;
  projectedBalance: number;
}

export interface CashFlowMovement {
  date: string;
  type: 'income' | 'expense' | 'receivable' | 'payable';
  description: string;
  amount: number;
  balance: number;
  reference?: string;
}

export interface CashFlowProjection {
  period: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
}

@Injectable()
export class CashFlowService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(AccountReceivable)
    private accountReceivableRepository: Repository<AccountReceivable>,
    @InjectRepository(AccountPayable)
    private accountPayableRepository: Repository<AccountPayable>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
  ) {}

  async getCashFlowSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<CashFlowSummary> {
    const dateFilter = startDate && endDate ? {
      createdAt: Between(new Date(startDate), new Date(endDate)),
    } : {};

    const expenses = await this.expenseRepository.find({
      where: dateFilter,
    });

    const paidReceivables = await this.accountReceivableRepository.find({
      where: {
        status: AccountReceivableStatus.PAID,
        ...dateFilter,
      },
    });

    const paidPayables = await this.accountPayableRepository.find({
      where: {
        status: AccountPayableStatus.PAID,
        ...dateFilter,
      },
    });

    const invoices = await this.invoiceRepository.find({
      where: dateFilter,
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const totalIncome = invoices.reduce((sum, inv) => sum + Number(inv.total), 0) +
                       paidReceivables.reduce((sum, ar) => sum + Number(ar.totalAmount), 0);
    const totalPayables = paidPayables.reduce((sum, ap) => sum + Number(ap.totalAmount), 0);

    const pendingReceivables = await this.accountReceivableRepository.find({
      where: {
        status: AccountReceivableStatus.PENDING,
      },
    });

    const pendingPayables = await this.accountPayableRepository.find({
      where: {
        status: AccountPayableStatus.PENDING,
      },
    });

    const accountsReceivableAmount = pendingReceivables.reduce(
      (sum, ar) => sum + Number(ar.remainingAmount),
      0,
    );

    const accountsPayableAmount = pendingPayables.reduce(
      (sum, ap) => sum + Number(ap.remainingAmount),
      0,
    );

    const netCashFlow = totalIncome - totalExpenses - totalPayables;
    const projectedBalance = netCashFlow + accountsReceivableAmount - accountsPayableAmount;

    return {
      totalIncome,
      totalExpenses,
      netCashFlow,
      accountsReceivableAmount,
      accountsPayableAmount,
      projectedBalance,
    };
  }

  async getCashFlowMovements(
    startDate?: string,
    endDate?: string,
    limit: number = 50,
  ): Promise<CashFlowMovement[]> {
    const movements: CashFlowMovement[] = [];

    const dateFilter = startDate && endDate ? {
      createdAt: Between(new Date(startDate), new Date(endDate)),
    } : {};

    const expenses = await this.expenseRepository.find({
      where: dateFilter,
      relations: ['category'],
    });

    const receivables = await this.accountReceivableRepository.find({
      where: dateFilter,
      relations: ['client'],
    });

    const payables = await this.accountPayableRepository.find({
      where: dateFilter,
      relations: ['provider'],
    });

    const invoices = await this.invoiceRepository.find({
      where: dateFilter,
      relations: ['client'],
    });

    expenses.forEach((exp) => {
      movements.push({
        date: exp.expenseDate,
        type: 'expense',
        description: exp.description,
        amount: -Number(exp.amount),
        balance: 0,
        reference: exp.reference,
      });
    });

    receivables.forEach((ar) => {
      movements.push({
        date: ar.dueDate,
        type: 'receivable',
        description: `Account Receivable - ${ar.client?.name || 'Unknown'}`,
        amount: Number(ar.remainingAmount),
        balance: 0,
        reference: ar.referenceNumber,
      });
    });

    payables.forEach((ap) => {
      movements.push({
        date: ap.dueDate,
        type: 'payable',
        description: `Account Payable - ${ap.provider?.name || 'Unknown'}`,
        amount: -Number(ap.remainingAmount),
        balance: 0,
        reference: ap.referenceNumber,
      });
    });

    invoices.forEach((inv) => {
      movements.push({
        date: inv.createdAt.toISOString().split('T')[0],
        type: 'income',
        description: `Invoice - ${inv.client?.name || 'Unknown'}`,
        amount: Number(inv.total),
        balance: 0,
        reference: inv.id.toString(),
      });
    });

    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let runningBalance = 0;
    movements.forEach((movement) => {
      runningBalance += movement.amount;
      movement.balance = runningBalance;
    });

    return movements.slice(0, limit);
  }

  async getCashFlowProjection(
    months: number = 3,
  ): Promise<CashFlowProjection[]> {
    const projections: CashFlowProjection[] = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const periodStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);

      const pendingReceivables = await this.accountReceivableRepository.find({
        where: {
          dueDate: Between(periodStart.toISOString(), periodEnd.toISOString()),
          status: AccountReceivableStatus.PENDING,
        },
      });

      const pendingPayables = await this.accountPayableRepository.find({
        where: {
          dueDate: Between(periodStart.toISOString(), periodEnd.toISOString()),
          status: AccountPayableStatus.PENDING,
        },
      });

      const projectedIncome = pendingReceivables.reduce(
        (sum, ar) => sum + Number(ar.remainingAmount),
        0,
      );

      const projectedExpenses = pendingPayables.reduce(
        (sum, ap) => sum + Number(ap.remainingAmount),
        0,
      );

      const projectedBalance = projectedIncome - projectedExpenses;

      projections.push({
        period: periodStart.toISOString().split('T')[0],
        projectedIncome,
        projectedExpenses,
        projectedBalance,
      });
    }

    return projections;
  }
}
