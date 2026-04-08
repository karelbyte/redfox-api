import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from '../models/expense.entity';
import {
  AccountReceivable,
  AccountReceivableStatus,
} from '../models/account-receivable.entity';
import {
  AccountPayable,
  AccountPayableStatus,
} from '../models/account-payable.entity';
import { Invoice } from '../models/invoice.entity';
import { TenantContext } from './tenant-context.service';

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
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() ?? '';
  }

  async getCashFlowSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<CashFlowSummary> {
    const orgId = this.organizationId;
    const dateRange =
      startDate && endDate
        ? Between(new Date(startDate), new Date(endDate))
        : undefined;

    const expenses = await this.expenseRepository.find({
      where: {
        organization_id: orgId,
        ...(dateRange ? { expenseDate: dateRange } : {}),
      },
    });

    const paidReceivables = await this.accountReceivableRepository.find({
      where: {
        organization_id: orgId,
        status: AccountReceivableStatus.PAID,
        ...(dateRange ? { dueDate: dateRange } : {}),
      },
    });

    const paidPayables = await this.accountPayableRepository.find({
      where: {
        organization_id: orgId,
        status: AccountPayableStatus.PAID,
        ...(dateRange ? { dueDate: dateRange } : {}),
      },
    });

    const invoices = await this.invoiceRepository.find({
      where: {
        organization_id: orgId,
        ...(dateRange ? { created_at: dateRange } : {}),
      },
    });

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0,
    );
    const totalIncome =
      invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0) +
      paidReceivables.reduce((sum, ar) => sum + Number(ar.totalAmount), 0);
    const totalPayables = paidPayables.reduce(
      (sum, ap) => sum + Number(ap.totalAmount),
      0,
    );

    const pendingReceivables = await this.accountReceivableRepository.find({
      where: {
        organization_id: orgId,
        status: AccountReceivableStatus.PENDING,
      },
    });

    const pendingPayables = await this.accountPayableRepository.find({
      where: { organization_id: orgId, status: AccountPayableStatus.PENDING },
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
    const projectedBalance =
      netCashFlow + accountsReceivableAmount - accountsPayableAmount;

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
    const orgId = this.organizationId;
    const movements: CashFlowMovement[] = [];
    const dateRange =
      startDate && endDate
        ? Between(new Date(startDate), new Date(endDate))
        : undefined;

    const expenses = await this.expenseRepository.find({
      where: {
        organization_id: orgId,
        ...(dateRange ? { expenseDate: dateRange } : {}),
      },
      relations: ['category'],
    });

    const receivables = await this.accountReceivableRepository.find({
      where: {
        organization_id: orgId,
        ...(dateRange ? { dueDate: dateRange } : {}),
      },
      relations: ['client'],
    });

    const payables = await this.accountPayableRepository.find({
      where: {
        organization_id: orgId,
        ...(dateRange ? { dueDate: dateRange } : {}),
      },
      relations: ['provider'],
    });

    const invoices = await this.invoiceRepository.find({
      where: {
        organization_id: orgId,
        ...(dateRange ? { created_at: dateRange } : {}),
      },
      relations: ['client'],
    });

    expenses.forEach((exp) => {
      movements.push({
        date:
          typeof (exp.expenseDate as any) === 'string'
            ? (exp.expenseDate as any).split('T')[0]
            : new Date(exp.expenseDate).toISOString().split('T')[0],
        type: 'expense',
        description: exp.description,
        amount: -Number(exp.amount),
        balance: 0,
        reference: exp.id.toString(),
      });
    });

    receivables.forEach((ar) => {
      movements.push({
        date:
          typeof (ar.dueDate as any) === 'string'
            ? (ar.dueDate as any).split('T')[0]
            : new Date(ar.dueDate).toISOString().split('T')[0],
        type: 'receivable',
        description: `Cuenta por cobrar - ${ar.client?.name || 'Desconocido'}`,
        amount: Number(ar.remainingAmount),
        balance: 0,
        reference: ar.referenceNumber,
      });
    });

    payables.forEach((ap) => {
      movements.push({
        date:
          typeof (ap.dueDate as any) === 'string'
            ? (ap.dueDate as any).split('T')[0]
            : new Date(ap.dueDate).toISOString().split('T')[0],
        type: 'payable',
        description: `Cuenta por pagar - ${ap.provider?.name || 'Desconocido'}`,
        amount: -Number(ap.remainingAmount),
        balance: 0,
        reference: ap.referenceNumber,
      });
    });

    invoices.forEach((inv) => {
      movements.push({
        date:
          typeof (inv.created_at as any) === 'string'
            ? (inv.created_at as any).split('T')[0]
            : new Date(inv.created_at).toISOString().split('T')[0],
        type: 'income',
        description: `Factura - ${inv.client?.name || 'Desconocido'}`,
        amount: Number(inv.total_amount),
        balance: 0,
        reference: inv.id.toString(),
      });
    });

    movements.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

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
    const orgId = this.organizationId;
    const projections: CashFlowProjection[] = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const periodStart = new Date(
        today.getFullYear(),
        today.getMonth() + i,
        1,
      );
      const periodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + i + 1,
        0,
      );

      const pendingReceivables = await this.accountReceivableRepository.find({
        where: {
          organization_id: orgId,
          dueDate: Between(periodStart, periodEnd),
          status: AccountReceivableStatus.PENDING,
        },
      });

      const pendingPayables = await this.accountPayableRepository.find({
        where: {
          organization_id: orgId,
          dueDate: Between(periodStart, periodEnd),
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

      projections.push({
        period: periodStart.toISOString().split('T')[0],
        projectedIncome,
        projectedExpenses,
        projectedBalance: projectedIncome - projectedExpenses,
      });
    }

    return projections;
  }
}
