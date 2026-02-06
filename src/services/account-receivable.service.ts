import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AccountReceivable, AccountReceivableStatus } from '../models/account-receivable.entity';
import { AccountReceivablePayment } from '../models/account-receivable-payment.entity';
import { CreateAccountReceivableDto } from '../dtos/account-receivable/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from '../dtos/account-receivable/update-account-receivable.dto';
import { CreateAccountReceivablePaymentDto } from '../dtos/account-receivable/create-payment.dto';

@Injectable()
export class AccountReceivableService {
  constructor(
    @InjectRepository(AccountReceivable)
    private accountReceivableRepository: Repository<AccountReceivable>,
    @InjectRepository(AccountReceivablePayment)
    private paymentRepository: Repository<AccountReceivablePayment>,
  ) {}

  async create(createAccountReceivableDto: CreateAccountReceivableDto): Promise<AccountReceivable> {
    const existingAccount = await this.accountReceivableRepository.findOne({
      where: { referenceNumber: createAccountReceivableDto.referenceNumber },
    });

    if (existingAccount) {
      throw new BadRequestException('Reference number already exists');
    }

    const accountReceivable = this.accountReceivableRepository.create({
      ...createAccountReceivableDto,
      remainingAmount: createAccountReceivableDto.totalAmount,
    });

    return await this.accountReceivableRepository.save(accountReceivable);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: AccountReceivableStatus,
    clientId?: number,
    overdue?: boolean
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
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('account.status = :status', { status });
    }

    if (clientId) {
      queryBuilder.andWhere('account.clientId = :clientId', { clientId });
    }

    if (overdue) {
      queryBuilder.andWhere('account.dueDate < :today AND account.status != :paidStatus', {
        today: new Date().toISOString().split('T')[0],
        paidStatus: AccountReceivableStatus.PAID,
      });
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

  async findOne(id: number): Promise<AccountReceivable> {
    const account = await this.accountReceivableRepository.findOne({
      where: { id },
      relations: ['client', 'invoice', 'payments', 'payments.createdByUser'],
    });

    if (!account) {
      throw new NotFoundException(`Account receivable with ID ${id} not found`);
    }

    return account;
  }

  async update(id: number, updateAccountReceivableDto: UpdateAccountReceivableDto): Promise<AccountReceivable> {
    const account = await this.findOne(id);
    Object.assign(account, updateAccountReceivableDto);
    return await this.accountReceivableRepository.save(account);
  }

  async remove(id: number): Promise<void> {
    const account = await this.findOne(id);
    await this.accountReceivableRepository.remove(account);
  }

  async addPayment(createPaymentDto: CreateAccountReceivablePaymentDto, userId: string): Promise<AccountReceivablePayment> {
    const account = await this.findOne(createPaymentDto.accountReceivableId);

    if (createPaymentDto.amount > account.remainingAmount) {
      throw new BadRequestException('Payment amount cannot exceed remaining amount');
    }

    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      createdBy: userId,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    account.paidAmount = Number(account.paidAmount) + Number(createPaymentDto.amount);
    account.remainingAmount = Number(account.totalAmount) - Number(account.paidAmount);

    if (account.remainingAmount === 0) {
      account.status = AccountReceivableStatus.PAID;
    } else if (account.paidAmount > 0) {
      account.status = AccountReceivableStatus.PARTIAL;
    }

    await this.accountReceivableRepository.save(account);

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

        if (new Date(account.dueDate) < today && account.status !== AccountReceivableStatus.PAID) {
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
      }
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
        statuses: [AccountReceivableStatus.PENDING, AccountReceivableStatus.PARTIAL] 
      })
      .execute();
  }
}