import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  AccountReceivable,
  AccountReceivableStatus,
} from '../models/account-receivable.entity';
import { AccountReceivablePayment } from '../models/account-receivable-payment.entity';
import { CreateAccountReceivableDto } from '../dtos/account-receivable/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from '../dtos/account-receivable/update-account-receivable.dto';
import { CreateAccountReceivablePaymentDto } from '../dtos/account-receivable/create-payment.dto';
import { ClientService } from './client.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class AccountReceivableService {
  constructor(
    @InjectRepository(AccountReceivable)
    private accountReceivableRepository: Repository<AccountReceivable>,
    @InjectRepository(AccountReceivablePayment)
    private paymentRepository: Repository<AccountReceivablePayment>,
    @Inject(forwardRef(() => ClientService))
    private readonly clientService: ClientService,
  ) { }

  async create(
    createAccountReceivableDto: CreateAccountReceivableDto,
  ): Promise<AccountReceivable> {
    const existingAccount = await this.accountReceivableRepository.findOne({
      where: { referenceNumber: createAccountReceivableDto.referenceNumber },
    });

    if (existingAccount) {
      throw new BadRequestException('Reference number already exists');
    }

    const totalAmount = Number(createAccountReceivableDto.totalAmount);
    const remainingAmount = Number(createAccountReceivableDto.remainingAmount);
    const paidAmount = totalAmount - remainingAmount;

    let status =
      createAccountReceivableDto.status || AccountReceivableStatus.PENDING;
    if (remainingAmount === 0) {
      status = AccountReceivableStatus.PAID;
    } else if (paidAmount > 0) {
      status = AccountReceivableStatus.PARTIAL;
    }

    const accountReceivable = new AccountReceivable();
    Object.assign(accountReceivable, createAccountReceivableDto);
    accountReceivable.totalAmount = totalAmount;
    accountReceivable.remainingAmount = remainingAmount;
    accountReceivable.paidAmount = paidAmount;
    accountReceivable.status = status;

    const savedAccount = await this.accountReceivableRepository.save(accountReceivable);

    // Update denormalized client balance (increase debt)
    await this.clientService.updateBalance(
      createAccountReceivableDto.clientId,
      remainingAmount,
    );

    return savedAccount;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: AccountReceivableStatus,
    clientId?: string,
    overdue?: boolean,
  ): Promise<{
    data: AccountReceivable[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.accountReceivableRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.client', 'client')
      .leftJoinAndSelect('account.invoice', 'invoice')
      .leftJoinAndSelect('account.payments', 'payments');

    if (search) {
      queryBuilder.andWhere(
        '(account.referenceNumber LIKE :search OR client.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('account.status = :status', { status });
    }

    if (clientId) {
      queryBuilder.andWhere('account.clientId = :clientId', { clientId });
    }

    if (overdue) {
      queryBuilder.andWhere(
        'account.dueDate < :today AND account.status != :paidStatus',
        {
          today: new Date().toISOString().split('T')[0],
          paidStatus: AccountReceivableStatus.PAID,
        },
      );
    }

    const total = await queryBuilder.getCount();
    const accounts = await queryBuilder
      .orderBy('account.dueDate', 'ASC')
      .limit(limit)
      .offset((page - 1) * limit)
      .getMany();

    return {
      data: accounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AccountReceivable> {
    const account = await this.accountReceivableRepository.findOne({
      where: { id },
      relations: ['client', 'invoice', 'payments', 'payments.createdByUser'],
    });

    if (!account) {
      throw new NotFoundException(`Account receivable with ID ${id} not found`);
    }

    return account;
  }

  async update(
    id: string,
    updateAccountReceivableDto: UpdateAccountReceivableDto,
  ): Promise<AccountReceivable> {
    const account = await this.findOne(id);
    Object.assign(account, updateAccountReceivableDto);
    return await this.accountReceivableRepository.save(account);
  }

  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);
    await this.accountReceivableRepository.remove(account);
  }

  async addPayment(
    createPaymentDto: CreateAccountReceivablePaymentDto,
    userId: string,
  ): Promise<AccountReceivablePayment> {
    const account = await this.findOne(createPaymentDto.accountReceivableId);

    if (createPaymentDto.amount > account.remainingAmount) {
      throw new BadRequestException(
        'Payment amount cannot exceed remaining amount',
      );
    }

    // Usar insert en lugar de create + save para evitar problemas con TypeORM
    const insertResult = await this.paymentRepository.insert({
      amount: createPaymentDto.amount,
      paymentDate: createPaymentDto.paymentDate,
      paymentMethod: createPaymentDto.paymentMethod,
      reference: createPaymentDto.reference,
      notes: createPaymentDto.notes,
      accountReceivableId: createPaymentDto.accountReceivableId,
      createdBy: userId,
    });

    // Obtener el pago recién creado
    const savedPayment = await this.paymentRepository.findOne({
      where: { id: insertResult.identifiers[0].id },
      relations: ['createdByUser'],
    });

    if (!savedPayment) {
      throw new NotFoundException('Payment could not be created');
    }

    const currentPaidAmount = Number(account.paidAmount);
    const currentRemainingAmount = Number(account.remainingAmount);
    const paymentAmount = Number(createPaymentDto.amount);

    account.paidAmount = Number((currentPaidAmount + paymentAmount).toFixed(2));
    account.remainingAmount = Number(
      (currentRemainingAmount - paymentAmount).toFixed(2),
    );

    if (account.remainingAmount === 0) {
      account.status = AccountReceivableStatus.PAID;
    } else if (account.paidAmount > 0) {
      account.status = AccountReceivableStatus.PARTIAL;
    }

    await this.accountReceivableRepository.update(account.id, {
      paidAmount: account.paidAmount,
      remainingAmount: account.remainingAmount,
      status: account.status,
    });

    // Update denormalized client balance (decrease debt)
    await this.clientService.updateBalance(
      account.clientId,
      -Number(createPaymentDto.amount),
    );

    return savedPayment;
  }

  async getAccountsReceivableSummary(): Promise<{
    totalAccounts: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    overdueCount: number;
  }> {
    const accounts = await this.accountReceivableRepository.find();
    const today = new Date();

    const summary = accounts.reduce(
      (acc, account) => {
        acc.totalAccounts++;
        acc.totalAmount += Number(account.totalAmount);
        acc.paidAmount += Number(account.paidAmount);
        acc.pendingAmount += Number(account.remainingAmount);

        if (
          new Date(account.dueDate) < today &&
          account.status !== AccountReceivableStatus.PAID
        ) {
          acc.overdueAmount += Number(account.remainingAmount);
          acc.overdueCount++;
        }

        return acc;
      },
      {
        totalAccounts: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        overdueCount: 0,
      },
    );

    return summary;
  }

  async getOverdueAccounts(): Promise<AccountReceivable[]> {
    const today = new Date();

    return await this.accountReceivableRepository.find({
      where: {
        dueDate: LessThan(today),
        status: AccountReceivableStatus.PENDING,
      },
      relations: ['client'],
      order: { dueDate: 'ASC' },
    });
  }

  async updateOverdueStatus(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.accountReceivableRepository
      .createQueryBuilder()
      .update(AccountReceivable)
      .set({ status: AccountReceivableStatus.OVERDUE })
      .where('dueDate < :today', { today })
      .andWhere('status IN (:...statuses)', {
        statuses: [
          AccountReceivableStatus.PENDING,
          AccountReceivableStatus.PARTIAL,
        ],
      })
      .execute();
  }

  async getClientCreditAnalysis(clientId: string): Promise<{
    totalCredit: number;
    usedCredit: number;
    availableCredit: number;
    overdueBalance: number;
    currentBalance: number;
    accounts: Array<{
      id: string;
      referenceNumber: string;
      issueDate: Date;
      dueDate: Date;
      totalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      status: AccountReceivableStatus;
      daysOverdue: number;
      agingCategory: string;
    }>;
  }> {
    const accounts = await this.accountReceivableRepository.find({
      where: { clientId },
      relations: ['client', 'client.credit', 'client.credit.currency'],
      order: { dueDate: 'ASC' },
    });

    const today = new Date();
    const totalCredit = accounts[0]?.client?.credit?.credit_limit || 0;

    let usedCredit = 0;
    let overdueBalance = 0;
    let currentBalance = 0;

    const accountsWithAging = accounts.map((account) => {
      const remainingAmount = Number(account.remainingAmount);
      usedCredit += remainingAmount;

      const dueDate = new Date(account.dueDate);
      const daysOverdue =
        account.status !== AccountReceivableStatus.PAID && dueDate < today
          ? Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          )
          : 0;

      if (daysOverdue > 0) {
        overdueBalance += remainingAmount;
      } else if (account.status !== AccountReceivableStatus.PAID) {
        currentBalance += remainingAmount;
      }

      // Categorizar por antigüedad
      let agingCategory = 'current';
      if (daysOverdue > 0 && daysOverdue <= 30) {
        agingCategory = '1-30';
      } else if (daysOverdue > 30 && daysOverdue <= 60) {
        agingCategory = '31-60';
      } else if (daysOverdue > 60 && daysOverdue <= 90) {
        agingCategory = '61-90';
      } else if (daysOverdue > 90) {
        agingCategory = '90+';
      }

      return {
        id: account.id,
        referenceNumber: account.referenceNumber,
        issueDate: account.issueDate,
        dueDate: account.dueDate,
        totalAmount: Number(account.totalAmount),
        paidAmount: Number(account.paidAmount),
        remainingAmount: remainingAmount,
        status: account.status,
        daysOverdue,
        agingCategory,
      };
    });

    return {
      totalCredit,
      usedCredit,
      availableCredit: totalCredit - usedCredit,
      overdueBalance,
      currentBalance,
      accounts: accountsWithAging,
    };
  }
}
