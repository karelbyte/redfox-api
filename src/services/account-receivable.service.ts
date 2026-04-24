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
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

@Injectable()
export class AccountReceivableService {
  constructor(
    @InjectRepository(AccountReceivable)
    private accountReceivableRepository: Repository<AccountReceivable>,
    @InjectRepository(AccountReceivablePayment)
    private paymentRepository: Repository<AccountReceivablePayment>,
    @Inject(forwardRef(() => ClientService))
    private readonly clientService: ClientService,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
  ) {}

  private async getOrganizationId(): Promise<string> {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        this.tenantContext.getUserId() || undefined,
      );
      throw new BadRequestException(message);
    }
    return orgId;
  }

  async create(
    createAccountReceivableDto: CreateAccountReceivableDto,
  ): Promise<AccountReceivable> {
    const organizationId = await this.getOrganizationId();
    const existingAccount = await this.accountReceivableRepository.findOne({
      where: {
        referenceNumber: createAccountReceivableDto.referenceNumber,
        organization_id: organizationId,
      },
    });

    if (existingAccount) {
      const message = await this.translationService.translate(
        'account_receivable.reference_exists',
        this.tenantContext.getUserId() || undefined,
      );
      throw new BadRequestException(message);
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
    accountReceivable.organization_id = organizationId;
    accountReceivable.totalAmount = totalAmount;
    accountReceivable.remainingAmount = remainingAmount;
    accountReceivable.paidAmount = paidAmount;
    accountReceivable.status = status;

    const savedAccount =
      await this.accountReceivableRepository.save(accountReceivable);

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
    const organizationId = await this.getOrganizationId();
    const queryBuilder = this.accountReceivableRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.client', 'client')
      .leftJoinAndSelect('account.invoice', 'invoice')
      .leftJoinAndSelect('account.payments', 'payments')
      .where('account.organization_id = :organizationId', {
        organizationId: organizationId,
      });

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
    const accountReceivable = await this.accountReceivableRepository.findOne({
      where: { id, organization_id: await this.getOrganizationId() },
      relations: ['client', 'invoice', 'payments', 'payments.createdByUser'],
    });

    if (!accountReceivable) {
      const message = await this.translationService.translate(
        'account_receivable.not_found',
        this.tenantContext.getUserId() || undefined,
        { id },
      );
      throw new NotFoundException(message);
    }

    return accountReceivable;
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

    if (account.status === AccountReceivableStatus.PAID) {
      const message = await this.translationService.translate(
        'account_receivable.already_paid',
        userId,
      );
      throw new BadRequestException(message);
    }

    const paymentAmount = Number(createPaymentDto.amount);
    if (paymentAmount > account.remainingAmount) {
      const message = await this.translationService.translate(
        'account_receivable.invalid_amount',
        userId,
      );
      throw new BadRequestException(message);
    }

    const organizationId = await this.getOrganizationId();

    // Usar insert en lugar de create + save para evitar problemas con TypeORM
    const insertResult = await this.paymentRepository.insert({
      organization_id: organizationId,
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
      const message = await this.translationService.translate(
        'general.server_error',
        userId,
      );
      throw new BadRequestException(message);
    }

    const currentPaidAmount = Number(account.paidAmount);
    const currentRemainingAmount = Number(account.remainingAmount);

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
    const organizationId = await this.getOrganizationId();
    const accounts = await this.accountReceivableRepository.find({
      where: { organization_id: organizationId },
    });
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
    const organizationId = await this.getOrganizationId();

    return await this.accountReceivableRepository.find({
      where: {
        dueDate: LessThan(today),
        status: AccountReceivableStatus.PENDING,
        organization_id: organizationId,
      },
      relations: ['client'],
      order: { dueDate: 'ASC' },
    });
  }

  async updateOverdueStatus(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const organizationId = await this.getOrganizationId();

    await this.accountReceivableRepository
      .createQueryBuilder()
      .update(AccountReceivable)
      .set({ status: AccountReceivableStatus.OVERDUE })
      .where('dueDate < :today', { today })
      .andWhere('organization_id = :organizationId', {
        organizationId: organizationId,
      })
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
    const organizationId = await this.getOrganizationId();
    const accounts = await this.accountReceivableRepository.find({
      where: { clientId, organization_id: organizationId },
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
