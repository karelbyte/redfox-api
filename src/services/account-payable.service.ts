import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountPayable, AccountPayableStatus } from '../models/account-payable.entity';
import { CreateAccountPayableDto } from '../dtos/account-payable/create-account-payable.dto';
import { UpdateAccountPayableDto } from '../dtos/account-payable/update-account-payable.dto';
import { CreateAccountPayablePaymentDto } from '../dtos/account-payable/create-payment.dto';
import { AccountPayablePayment } from '../models/account-payable-payment.entity';
import { ProviderService } from './provider.service';

@Injectable()
export class AccountPayableService {
  constructor(
    @InjectRepository(AccountPayable)
    private accountPayableRepository: Repository<AccountPayable>,
    @InjectRepository(AccountPayablePayment)
    private paymentRepository: Repository<AccountPayablePayment>,
    @Inject(forwardRef(() => ProviderService))
    private readonly providerService: ProviderService,
  ) { }

  async create(createAccountPayableDto: CreateAccountPayableDto): Promise<AccountPayable> {
    const accountPayable = this.accountPayableRepository.create(createAccountPayableDto);
    const savedAccount = await this.accountPayableRepository.save(accountPayable);

    // Update denormalized provider balance (increase debt to provider)
    await this.providerService.updateBalance(createAccountPayableDto.providerId, createAccountPayableDto.totalAmount);

    return savedAccount;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: AccountPayableStatus,
    providerId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    data: AccountPayable[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.accountPayableRepository
      .createQueryBuilder('accountPayable')
      .leftJoinAndSelect('accountPayable.provider', 'provider')
      .leftJoinAndSelect('accountPayable.purchaseOrder', 'purchaseOrder')
      .leftJoinAndSelect('accountPayable.payments', 'payments');

    if (search) {
      queryBuilder.andWhere(
        '(accountPayable.referenceNumber LIKE :search OR provider.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('accountPayable.status = :status', { status });
    }

    if (providerId) {
      queryBuilder.andWhere('accountPayable.providerId = :providerId', { providerId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('accountPayable.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const total = await queryBuilder.getCount();
    const accountsPayable = await queryBuilder
      .orderBy('accountPayable.dueDate', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit)
      .getMany();

    return {
      data: accountsPayable,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<AccountPayable> {
    const accountPayable = await this.accountPayableRepository.findOne({
      where: { id },
      relations: ['provider', 'purchaseOrder', 'payments'],
    });

    if (!accountPayable) {
      throw new NotFoundException(`Account Payable with ID ${id} not found`);
    }

    return accountPayable;
  }

  async update(id: number, updateAccountPayableDto: UpdateAccountPayableDto): Promise<AccountPayable> {
    const accountPayable = await this.findOne(id);
    Object.assign(accountPayable, updateAccountPayableDto);
    return await this.accountPayableRepository.save(accountPayable);
  }

  async remove(id: number): Promise<void> {
    const accountPayable = await this.findOne(id);
    await this.accountPayableRepository.remove(accountPayable);
  }

  async getAccountsPayableSummary(startDate?: string, endDate?: string): Promise<{
    totalAccounts: number;
    paidAccounts: number;
    pendingAccounts: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  }> {
    const queryBuilder = this.accountPayableRepository.createQueryBuilder('accountPayable');

    if (startDate && endDate) {
      queryBuilder.where('accountPayable.dueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const accountsPayable = await queryBuilder.getMany();

    const summary = accountsPayable.reduce(
      (acc, account) => {
        acc.totalAccounts++;
        acc.totalAmount += Number(account.totalAmount);
        acc.paidAmount += Number(account.paidAmount);
        acc.pendingAmount += Number(account.remainingAmount);

        if (account.status === AccountPayableStatus.PAID) {
          acc.paidAccounts++;
        } else {
          acc.pendingAccounts++;
        }

        return acc;
      },
      {
        totalAccounts: 0,
        paidAccounts: 0,
        pendingAccounts: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      }
    );

    return summary;
  }

  async addPayment(createPaymentDto: CreateAccountPayablePaymentDto, userId: string): Promise<AccountPayablePayment> {
    const account = await this.findOne(createPaymentDto.accountPayableId);

    if (createPaymentDto.amount > account.remainingAmount) {
      throw new BadRequestException('Payment amount cannot exceed remaining amount');
    }

    const insertResult = await this.paymentRepository.insert({
      amount: createPaymentDto.amount,
      paymentDate: createPaymentDto.paymentDate,
      paymentMethod: createPaymentDto.paymentMethod,
      reference: createPaymentDto.reference,
      notes: createPaymentDto.notes,
      accountPayableId: createPaymentDto.accountPayableId,
      createdBy: userId,
    });

    const savedPayment = await this.paymentRepository.findOne({
      where: { id: insertResult.identifiers[0].id },
    });

    if (!savedPayment) {
      throw new NotFoundException('Payment could not be created');
    }

    account.paidAmount = Number(account.paidAmount) + Number(createPaymentDto.amount);
    account.remainingAmount = Number(account.totalAmount) - Number(account.paidAmount);

    if (account.remainingAmount === 0) {
      account.status = AccountPayableStatus.PAID;
    } else if (account.paidAmount > 0) {
      account.status = AccountPayableStatus.PARTIAL;
    }

    await this.accountPayableRepository.save(account);

    // Update denormalized provider balance (decrease debt to provider)
    await this.providerService.updateBalance(account.providerId, -Number(createPaymentDto.amount));

    return savedPayment;
  }
}
