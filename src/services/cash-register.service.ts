import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CashRegister,
  CashRegisterStatus,
} from '../models/cash-register.entity';
import { CashTransaction } from '../models/cash-transaction.entity';
import { CreateCashRegisterDto } from '../dtos/cash-register/create-cash-register.dto';
import { UpdateCashRegisterDto } from '../dtos/cash-register/update-cash-register.dto';
import { OpenCashRegisterDto } from '../dtos/cash-register/open-cash-register.dto';
import { CashRegisterResponseDto } from '../dtos/cash-register/cash-register-response.dto';
import { CashRegisterBalanceResponseDto } from '../dtos/cash-register/cash-register-balance-response.dto';
import { CashRegisterMapper } from './mappers/cash-register.mapper';
import { TranslationService } from './translation.service';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    @InjectRepository(CashTransaction)
    private readonly cashTransactionRepository: Repository<CashTransaction>,
    private readonly translationService: TranslationService,
  ) {}

  async getCurrentCashRegister(
    userId?: string,
  ): Promise<CashRegisterResponseDto> {
    const currentCashRegister = await this.cashRegisterRepository.findOne({
      where: { status: CashRegisterStatus.OPEN },
      order: { created_at: 'DESC' },
    });

    if (!currentCashRegister) {
      const message = await this.translationService.translate(
        'cash_register.no_open_register',
        userId,
      );
      throw new NotFoundException(message);
    }

    return CashRegisterMapper.mapToResponseDto(currentCashRegister);
  }

  async create(
    createCashRegisterDto: CreateCashRegisterDto,
    userId?: string,
  ): Promise<CashRegisterResponseDto> {
    try {
      // Verificar si ya existe una caja con el mismo código
      const existingCashRegister = await this.cashRegisterRepository.findOne({
        where: { code: createCashRegisterDto.code },
      });

      if (existingCashRegister) {
        const message = await this.translationService.translate(
          'cash_register.already_exists',
          userId,
          { code: createCashRegisterDto.code },
        );
        throw new ConflictException(message);
      }

      const cashRegister = this.cashRegisterRepository.create({
        ...createCashRegisterDto,
        initialAmount: createCashRegisterDto.initial_amount,
        currentAmount: createCashRegisterDto.initial_amount,
        openedBy: userId,
      });

      const savedCashRegister =
        await this.cashRegisterRepository.save(cashRegister);
      return CashRegisterMapper.mapToResponseDto(savedCashRegister);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('cash_registers.UQ_')
      ) {
        const message = await this.translationService.translate(
          'cash_register.already_exists',
          userId,
          { code: createCashRegisterDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async openCashRegister(
    openCashRegisterDto: OpenCashRegisterDto,
    userId?: string,
  ): Promise<CashRegisterResponseDto> {
    // Verificar si ya hay una caja abierta
    const existingOpenCashRegister = await this.cashRegisterRepository.findOne({
      where: { status: CashRegisterStatus.OPEN },
    });

    if (existingOpenCashRegister) {
      const message = await this.translationService.translate(
        'cash_register.already_open',
        userId,
      );
      throw new BadRequestException(message);
    }

    // Generar código único para la caja
    const timestamp = Date.now();
    const code = `CASH-${timestamp}`;

    const cashRegister = this.cashRegisterRepository.create({
      code,
      name:
        openCashRegisterDto.name || `Caja ${new Date().toLocaleDateString()}`,
      description: openCashRegisterDto.description,
      initialAmount: openCashRegisterDto.initial_amount,
      currentAmount: openCashRegisterDto.initial_amount,
      status: CashRegisterStatus.OPEN,
      openedAt: new Date(),
      openedBy: userId,
    });

    const savedCashRegister =
      await this.cashRegisterRepository.save(cashRegister);
    return CashRegisterMapper.mapToResponseDto(savedCashRegister);
  }

  async closeCashRegister(
    id: string,
    userId?: string,
  ): Promise<CashRegisterResponseDto> {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { id },
    });

    if (!cashRegister) {
      const message = await this.translationService.translate(
        'cash_register.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    if (cashRegister.status === CashRegisterStatus.CLOSED) {
      const message = await this.translationService.translate(
        'cash_register.already_closed',
        userId,
      );
      throw new BadRequestException(message);
    }

    cashRegister.status = CashRegisterStatus.CLOSED;
    cashRegister.closedAt = new Date();
    cashRegister.closedBy = userId || '';

    const updatedCashRegister =
      await this.cashRegisterRepository.save(cashRegister);
    return CashRegisterMapper.mapToResponseDto(updatedCashRegister);
  }

  async updateCashRegister(
    id: string,
    updateCashRegisterDto: UpdateCashRegisterDto,
    userId?: string,
  ): Promise<CashRegisterResponseDto> {
    try {
      const cashRegister = await this.cashRegisterRepository.findOne({
        where: { id },
      });

      if (!cashRegister) {
        const message = await this.translationService.translate(
          'cash_register.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }

      // Si se está actualizando el código, verificar que no exista
      if (
        updateCashRegisterDto.code &&
        updateCashRegisterDto.code !== cashRegister.code
      ) {
        const existingCashRegister = await this.cashRegisterRepository.findOne({
          where: { code: updateCashRegisterDto.code },
        });

        if (existingCashRegister) {
          const message = await this.translationService.translate(
            'cash_register.already_exists',
            userId,
            { code: updateCashRegisterDto.code },
          );
          throw new ConflictException(message);
        }
      }

      const updatedData = {
        ...updateCashRegisterDto,
        ...(updateCashRegisterDto.current_amount && {
          currentAmount: updateCashRegisterDto.current_amount,
        }),
      };

      const updatedCashRegister = await this.cashRegisterRepository.save({
        ...cashRegister,
        ...updatedData,
      });

      return CashRegisterMapper.mapToResponseDto(updatedCashRegister);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (
        dbError?.code === 'ER_DUP_ENTRY' &&
        dbError?.message?.includes('cash_registers.UQ_')
      ) {
        const message = await this.translationService.translate(
          'cash_register.already_exists',
          userId,
          { code: updateCashRegisterDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async getCashRegisterBalance(
    id: string,
    userId?: string,
  ): Promise<CashRegisterBalanceResponseDto> {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { id },
    });

    if (!cashRegister) {
      const message = await this.translationService.translate(
        'cash_register.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    // Obtener estadísticas de transacciones
    const [totalTransactions, lastTransaction] = await Promise.all([
      this.cashTransactionRepository.count({
        where: { cashRegisterId: id },
      }),
      this.cashTransactionRepository.findOne({
        where: { cashRegisterId: id },
        order: { created_at: 'DESC' },
        select: ['created_at'],
      }),
    ]);

    return {
      current_amount: Number(cashRegister.currentAmount),
      total_transactions: totalTransactions,
      last_transaction_at: lastTransaction?.created_at || null,
    };
  }

  async findOne(id: string, userId?: string): Promise<CashRegisterResponseDto> {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { id },
    });

    if (!cashRegister) {
      const message = await this.translationService.translate(
        'cash_register.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return CashRegisterMapper.mapToResponseDto(cashRegister);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { id },
    });

    if (!cashRegister) {
      const message = await this.translationService.translate(
        'cash_register.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.cashRegisterRepository.softDelete(id);
  }
}
