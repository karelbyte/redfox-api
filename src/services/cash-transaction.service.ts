import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import {
  CashTransaction,
  CashTransactionType,
  PaymentMethod,
} from '../models/cash-transaction.entity';
import {
  CashRegister,
  CashRegisterStatus,
} from '../models/cash-register.entity';
import { CreateCashTransactionDto } from '../dtos/cash-transaction/create-cash-transaction.dto';
import { UpdateCashTransactionDto } from '../dtos/cash-transaction/update-cash-transaction.dto';
import { CashTransactionQueryDto } from '../dtos/cash-transaction/cash-transaction-query.dto';
import { CashReportQueryDto } from '../dtos/cash-transaction/cash-report-query.dto';
import { CashTransactionResponseDto } from '../dtos/cash-transaction/cash-transaction-response.dto';
import { CashReportResponseDto } from '../dtos/cash-transaction/cash-report-response.dto';
import { CashTransactionMapper } from './mappers/cash-transaction.mapper';
import { TranslationService } from './translation.service';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class CashTransactionService {
  constructor(
    @InjectRepository(CashTransaction)
    private readonly cashTransactionRepository: Repository<CashTransaction>,
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createCashTransactionDto: CreateCashTransactionDto,
    userId?: string,
  ): Promise<CashTransactionResponseDto> {
    // Usar transacción de base de datos para garantizar consistencia
    const queryRunner =
      this.cashTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar que la caja registradora existe
      const cashRegister = await queryRunner.manager.findOne(CashRegister, {
        where: { id: createCashTransactionDto.cash_register_id },
      });

      if (!cashRegister) {
        const message = await this.translationService.translate(
          'cash_transaction.cash_register_not_found',
          userId,
          { id: createCashTransactionDto.cash_register_id },
        );
        throw new NotFoundException(message);
      }

      // Verificar que la caja esté abierta
      if (cashRegister.status !== CashRegisterStatus.OPEN) {
        const message = await this.translationService.translate(
          'cash_transaction.cash_register_closed',
          userId,
        );
        throw new BadRequestException(message);
      }

      // Crear la transacción
      const cashTransaction = queryRunner.manager.create(CashTransaction, {
        cashRegisterId: createCashTransactionDto.cash_register_id,
        type: createCashTransactionDto.type,
        amount: createCashTransactionDto.amount,
        description: createCashTransactionDto.description,
        reference: createCashTransactionDto.reference,
        paymentMethod: createCashTransactionDto.payment_method,
        saleId: createCashTransactionDto.sale_id,
        createdBy: userId,
      });

      const savedTransaction = await queryRunner.manager.save(
        CashTransaction,
        cashTransaction,
      );

      // Actualizar el balance de la caja registradora
      await this.updateCashRegisterBalanceInTransaction(
        queryRunner,
        cashRegister,
        createCashTransactionDto.amount,
        createCashTransactionDto.type,
      );

      await queryRunner.commitTransaction();

      return CashTransactionMapper.mapToResponseDto(savedTransaction);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getCashTransactions(
    cashRegisterId: string,
    queryDto: CashTransactionQueryDto,
    userId?: string,
  ): Promise<PaginatedResponse<CashTransactionResponseDto>> {
    // Verificar que la caja registradora existe
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { id: cashRegisterId },
    });

    if (!cashRegister) {
      const message = await this.translationService.translate(
        'cash_transaction.cash_register_not_found',
        userId,
        { id: cashRegisterId },
      );
      throw new NotFoundException(message);
    }

    const {
      page = 1,
      limit = 10,
      type,
      payment_method,
      start_date,
      end_date,
    } = queryDto;
    const skip = (page - 1) * limit;

    // Construir condiciones de búsqueda
    const whereConditions: any = { cashRegisterId };

    if (type) {
      whereConditions.type = type;
    }

    if (payment_method) {
      whereConditions.paymentMethod = payment_method;
    }

    if (start_date && end_date) {
      whereConditions.created_at = Between(
        new Date(start_date),
        new Date(end_date),
      );
    }

    const [transactions, total] =
      await this.cashTransactionRepository.findAndCount({
        where: whereConditions,
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      });

    const data = CashTransactionMapper.mapToResponseDtoList(transactions);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCashReport(
    cashRegisterId: string,
    queryDto: CashReportQueryDto,
    userId?: string,
  ): Promise<CashReportResponseDto> {
    // Verificar que la caja registradora existe
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { id: cashRegisterId },
    });

    if (!cashRegister) {
      const message = await this.translationService.translate(
        'cash_transaction.cash_register_not_found',
        userId,
        { id: cashRegisterId },
      );
      throw new NotFoundException(message);
    }

    const { start_date, end_date } = queryDto;
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Obtener todas las transacciones en el rango de fechas
    const transactions = await this.cashTransactionRepository.find({
      where: {
        cashRegisterId,
        created_at: Between(startDate, endDate),
      },
      order: { created_at: 'ASC' },
    });

    // Calcular estadísticas
    const totalSales = transactions
      .filter((t) => t.type === CashTransactionType.SALE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalRefunds = transactions
      .filter((t) => t.type === CashTransactionType.REFUND)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalAdjustments = transactions
      .filter((t) => t.type === CashTransactionType.ADJUSTMENT)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const cashSales = transactions
      .filter(
        (t) =>
          t.type === CashTransactionType.SALE &&
          t.paymentMethod === PaymentMethod.CASH,
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const cardSales = transactions
      .filter(
        (t) =>
          t.type === CashTransactionType.SALE &&
          t.paymentMethod === PaymentMethod.CARD,
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calcular balance de apertura y cierre
    const openingBalance = Number(cashRegister.initialAmount);
    const closingBalance = Number(cashRegister.currentAmount);

    const mappedTransactions =
      CashTransactionMapper.mapToResponseDtoList(transactions);

    return {
      total_sales: totalSales,
      total_refunds: totalRefunds,
      total_adjustments: totalAdjustments,
      cash_sales: cashSales,
      card_sales: cardSales,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      transactions: mappedTransactions,
    };
  }

  private async updateCashRegisterBalance(
    cashRegister: CashRegister,
    amount: number,
    type: CashTransactionType,
  ): Promise<void> {
    let newBalance = Number(cashRegister.currentAmount);

    switch (type) {
      case CashTransactionType.SALE:
      case CashTransactionType.DEPOSIT:
        newBalance += amount;
        break;
      case CashTransactionType.REFUND:
      case CashTransactionType.WITHDRAWAL:
        newBalance -= amount;
        break;
      case CashTransactionType.ADJUSTMENT:
        // Los ajustes pueden ser positivos o negativos, asumimos que el amount ya tiene el signo correcto
        newBalance += amount;
        break;
    }

    cashRegister.currentAmount = newBalance;
    await this.cashRegisterRepository.save(cashRegister);
  }

  private async updateCashRegisterBalanceInTransaction(
    queryRunner: any,
    cashRegister: CashRegister,
    amount: number,
    type: CashTransactionType,
  ): Promise<void> {
    let newBalance = Number(cashRegister.currentAmount);

    switch (type) {
      case CashTransactionType.SALE:
      case CashTransactionType.DEPOSIT:
        newBalance += amount;
        break;
      case CashTransactionType.REFUND:
      case CashTransactionType.WITHDRAWAL:
        newBalance -= amount;
        break;
      case CashTransactionType.ADJUSTMENT:
        // Los ajustes pueden ser positivos o negativos, asumimos que el amount ya tiene el signo correcto
        newBalance += amount;
        break;
    }

    cashRegister.currentAmount = newBalance;
    await queryRunner.manager.save(CashRegister, cashRegister);
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<CashTransactionResponseDto> {
    const transaction = await this.cashTransactionRepository.findOne({
      where: { id },
    });

    if (!transaction) {
      const message = await this.translationService.translate(
        'cash_transaction.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return CashTransactionMapper.mapToResponseDto(transaction);
  }

  async update(
    id: string,
    updateCashTransactionDto: UpdateCashTransactionDto,
    userId?: string,
  ): Promise<CashTransactionResponseDto> {
    const queryRunner =
      this.cashTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cashTransaction = await queryRunner.manager.findOne(
        CashTransaction,
        {
          where: { id },
          relations: ['cashRegister'],
        },
      );

      if (!cashTransaction) {
        const message = await this.translationService.translate(
          'cash_transaction.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      // Verificar que la caja esté abierta
      if (cashTransaction.cashRegister.status !== CashRegisterStatus.OPEN) {
        const message = await this.translationService.translate(
          'cash_transaction.cash_register_closed',
          userId,
        );
        throw new BadRequestException(message);
      }

      // Calcular la diferencia en el monto solo si se está actualizando
      let amountDifference = 0;
      if (updateCashTransactionDto.amount !== undefined) {
        amountDifference =
          updateCashTransactionDto.amount - cashTransaction.amount;
      }

      // Actualizar la transacción
      Object.assign(cashTransaction, updateCashTransactionDto);
      const updatedTransaction = await queryRunner.manager.save(
        CashTransaction,
        cashTransaction,
      );

      // Actualizar el balance de la caja registradora si el monto cambió
      if (amountDifference !== 0) {
        await this.updateCashRegisterBalanceInTransaction(
          queryRunner,
          cashTransaction.cashRegister,
          amountDifference,
          cashTransaction.type,
        );
      }

      await queryRunner.commitTransaction();
      return CashTransactionMapper.mapToResponseDto(updatedTransaction);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const queryRunner =
      this.cashTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cashTransaction = await queryRunner.manager.findOne(
        CashTransaction,
        {
          where: { id },
          relations: ['cashRegister'],
        },
      );

      if (!cashTransaction) {
        const message = await this.translationService.translate(
          'cash_transaction.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      // Verificar que la caja esté abierta
      if (cashTransaction.cashRegister.status !== CashRegisterStatus.OPEN) {
        const message = await this.translationService.translate(
          'cash_transaction.cash_register_closed',
          userId,
        );
        throw new BadRequestException(message);
      }

      // Revertir el balance de la caja registradora
      const amountToRevert = cashTransaction.amount;
      const typeToRevert = cashTransaction.type;

      // Eliminar la transacción
      await queryRunner.manager.remove(CashTransaction, cashTransaction);

      // Actualizar el balance (revertir la operación)
      let newBalance = Number(cashTransaction.cashRegister.currentAmount);

      switch (typeToRevert) {
        case CashTransactionType.SALE:
        case CashTransactionType.DEPOSIT:
          newBalance -= amountToRevert;
          break;
        case CashTransactionType.REFUND:
        case CashTransactionType.WITHDRAWAL:
          newBalance += amountToRevert;
          break;
        case CashTransactionType.ADJUSTMENT:
          newBalance -= amountToRevert;
          break;
      }

      cashTransaction.cashRegister.currentAmount = newBalance;
      await queryRunner.manager.save(
        CashRegister,
        cashTransaction.cashRegister,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
