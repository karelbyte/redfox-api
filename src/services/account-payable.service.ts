import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccountPayable,
  AccountPayableStatus,
} from '../models/account-payable.entity';
import { CreateAccountPayableDto } from '../dtos/account-payable/create-account-payable.dto';
import { UpdateAccountPayableDto } from '../dtos/account-payable/update-account-payable.dto';
import { CreateAccountPayablePaymentDto } from '../dtos/account-payable/create-payment.dto';
import { AccountPayablePayment } from '../models/account-payable-payment.entity';
import { ProviderService } from './provider.service';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

@Injectable()
export class AccountPayableService {
  constructor(
    @InjectRepository(AccountPayable)
    private accountPayableRepository: Repository<AccountPayable>,
    @InjectRepository(AccountPayablePayment)
    private paymentRepository: Repository<AccountPayablePayment>,
    @Inject(forwardRef(() => ProviderService))
    private readonly providerService: ProviderService,
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
    createAccountPayableDto: CreateAccountPayableDto,
  ): Promise<AccountPayable> {
    const organizationId = await this.getOrganizationId();
    const totalAmount = Number(createAccountPayableDto.totalAmount);
    const remainingAmount = Number(createAccountPayableDto.remainingAmount);
    const paidAmount = totalAmount - remainingAmount;

    let status = createAccountPayableDto.status || AccountPayableStatus.PENDING;
    if (remainingAmount === 0) {
      status = AccountPayableStatus.PAID;
    } else if (paidAmount > 0) {
      status = AccountPayableStatus.PARTIAL;
    }

    const accountPayable = new AccountPayable();
    Object.assign(accountPayable, createAccountPayableDto);
    accountPayable.organization_id = organizationId;
    accountPayable.totalAmount = totalAmount;
    accountPayable.remainingAmount = remainingAmount;
    accountPayable.paidAmount = paidAmount;
    accountPayable.status = status;

    const savedAccount =
      await this.accountPayableRepository.save(accountPayable);

    // Update denormalized provider balance (increase debt to provider)
    await this.providerService.updateBalance(
      createAccountPayableDto.providerId,
      remainingAmount,
    );

    return savedAccount;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: AccountPayableStatus,
    providerId?: string,
    startDate?: string,
    endDate?: string,
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
      .leftJoinAndSelect('accountPayable.payments', 'payments')
      .where('accountPayable.organization_id = :organizationId', {
        organizationId: await this.getOrganizationId(),
      });

    if (search) {
      queryBuilder.andWhere(
        '(accountPayable.referenceNumber LIKE :search OR provider.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('accountPayable.status = :status', { status });
    }

    if (providerId) {
      queryBuilder.andWhere('accountPayable.providerId = :providerId', {
        providerId,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'accountPayable.dueDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
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

  async findOne(id: string): Promise<AccountPayable> {
    const accountPayable = await this.accountPayableRepository.findOne({
      where: { id, organization_id: await this.getOrganizationId() },
      relations: [
        'provider',
        'purchaseOrder',
        'payments',
        'payments.createdByUser',
      ],
    });

    if (!accountPayable) {
      const message = await this.translationService.translate(
        'account_payable.not_found',
        this.tenantContext.getUserId() || undefined,
        { id },
      );
      throw new NotFoundException(message);
    }

    return accountPayable;
  }

  async update(
    id: string,
    updateAccountPayableDto: UpdateAccountPayableDto,
  ): Promise<AccountPayable> {
    const accountPayable = await this.findOne(id);
    Object.assign(accountPayable, updateAccountPayableDto);
    return await this.accountPayableRepository.save(accountPayable);
  }

  async remove(id: string): Promise<void> {
    const accountPayable = await this.findOne(id);
    await this.accountPayableRepository.remove(accountPayable);
  }

  async getAccountsPayableSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalAccounts: number;
    paidAccounts: number;
    pendingAccounts: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  }> {
    const queryBuilder = this.accountPayableRepository
      .createQueryBuilder('accountPayable')
      .where('accountPayable.organization_id = :organizationId', {
        organizationId: await this.getOrganizationId(),
      });

    if (startDate && endDate) {
      queryBuilder.where(
        'accountPayable.dueDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
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
      },
    );

    return summary;
  }

  async addPayment(
    createPaymentDto: CreateAccountPayablePaymentDto,
    userId: string,
  ): Promise<AccountPayablePayment> {
    const account = await this.findOne(createPaymentDto.accountPayableId);

    if (createPaymentDto.amount > account.remainingAmount) {
      throw new BadRequestException(
        'Payment amount cannot exceed remaining amount',
      );
    }

    const organizationId = await this.getOrganizationId();

    const insertResult = await this.paymentRepository.insert({
      organization_id: organizationId,
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

    const currentPaidAmount = Number(account.paidAmount);
    const currentRemainingAmount = Number(account.remainingAmount);
    const paymentAmount = Number(createPaymentDto.amount);

    account.paidAmount = Number((currentPaidAmount + paymentAmount).toFixed(2));
    account.remainingAmount = Number(
      (currentRemainingAmount - paymentAmount).toFixed(2),
    );

    if (account.remainingAmount === 0) {
      account.status = AccountPayableStatus.PAID;
    } else if (account.paidAmount > 0) {
      account.status = AccountPayableStatus.PARTIAL;
    }

    await this.accountPayableRepository.update(account.id, {
      paidAmount: account.paidAmount,
      remainingAmount: account.remainingAmount,
      status: account.status,
    });

    // Update denormalized provider balance (decrease debt to provider)
    await this.providerService.updateBalance(
      account.providerId,
      -Number(createPaymentDto.amount),
    );

    return savedPayment;
  }
}
