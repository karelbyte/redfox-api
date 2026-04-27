import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
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
import { TenantContext } from './tenant-context.service';
import { UserAttributionService } from './user-attribution.service';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    @InjectRepository(CashTransaction)
    private readonly cashTransactionRepository: Repository<CashTransaction>,
    private readonly translationService: TranslationService,
    private readonly tenantContext: TenantContext,
    private readonly userAttributionService: UserAttributionService,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  async findAll(
    page: string = '1',
    limit: string = '10',
    term: string = '',
    userId?: string,
  ): Promise<PaginatedResponseDto<CashRegisterResponseDto>> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const orgFilter = { organization_id: this.organizationId };

    let authorizedCashRegisterIds: string[] | null = null;
    if (userId) {
      authorizedCashRegisterIds = await this.userAttributionService.getAuthorizedCashRegisterIds(userId);
    }

    let whereConditions;
    if (term) {
      const baseWhere = [
        { code: Like(`%${term}%`), ...orgFilter },
        { name: Like(`%${term}%`), ...orgFilter },
      ];
      if (userId && authorizedCashRegisterIds !== null && authorizedCashRegisterIds.length > 0) {
        whereConditions = baseWhere.map((w) => ({ ...w, id: In(authorizedCashRegisterIds!) }));
      } else if (userId && authorizedCashRegisterIds !== null) {
        whereConditions = [];
      } else {
        whereConditions = baseWhere;
      }
    } else {
      if (userId && authorizedCashRegisterIds !== null && authorizedCashRegisterIds.length > 0) {
        whereConditions = { id: In(authorizedCashRegisterIds), ...orgFilter };
      } else if (userId && authorizedCashRegisterIds !== null) {
        whereConditions = [];
      } else {
        whereConditions = orgFilter;
      }
    }

    const [data, total] = await this.cashRegisterRepository.findAndCount({
      where: whereConditions,
      skip,
      take: limitNum,
      order: { created_at: 'DESC' },
    });

    return {
      data: data.map((cashRegister) => CashRegisterMapper.mapToResponseDto(cashRegister)),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getCurrentCashRegister(
    userId?: string,
  ): Promise<CashRegisterResponseDto> {
    const authorizedCashRegisterIds =
      await this.userAttributionService.getAuthorizedCashRegisterIds(
        userId || '',
      );

    const whereConditions: any = {
      status: CashRegisterStatus.OPEN,
      organization_id: this.organizationId,
    };

    if (authorizedCashRegisterIds !== null) {
      if (authorizedCashRegisterIds.length === 0) {
        const message = await this.translationService.translate(
          'cash_register.no_open_register',
          userId,
        );
        throw new NotFoundException(message);
      }
      whereConditions.id = In(authorizedCashRegisterIds);
    }

    const currentCashRegister = await this.cashRegisterRepository.findOne({
      where: whereConditions,
      order: { openedAt: 'DESC' },
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
        where: {
          code: createCashRegisterDto.code,
          organization_id: this.organizationId,
        },
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
        organization_id: this.organizationId,
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
      organization_id: this.organizationId,
    });

    const savedCashRegister =
      await this.cashRegisterRepository.save(cashRegister);
    return CashRegisterMapper.mapToResponseDto(savedCashRegister);
  }

  async getAuthorizedOpenCashRegisters(
    userId?: string,
  ): Promise<CashRegisterResponseDto[]> {
    const authorizedCashRegisterIds =
      await this.userAttributionService.getAuthorizedCashRegisterIds(
        userId || '',
      );

    const whereConditions: any = {
      status: CashRegisterStatus.OPEN,
      organization_id: this.organizationId,
    };

    if (authorizedCashRegisterIds !== null) {
      if (authorizedCashRegisterIds.length === 0) {
        return [];
      }
      whereConditions.id = In(authorizedCashRegisterIds);
    }

    const cashRegisters = await this.cashRegisterRepository.find({
      where: whereConditions,
      order: { openedAt: 'DESC' },
    });

    return cashRegisters.map((cr) => CashRegisterMapper.mapToResponseDto(cr));
  }

  async closeCashRegister(
    id: string,
    userId?: string,
  ): Promise<CashRegisterResponseDto> {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { id, organization_id: this.organizationId },
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
        where: { id, organization_id: this.organizationId },
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
          where: {
            code: updateCashRegisterDto.code,
            organization_id: this.organizationId,
          },
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
      where: { id, organization_id: this.organizationId },
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
      where: { id, organization_id: this.organizationId },
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
      where: { id, organization_id: this.organizationId },
    });

    if (!cashRegister) {
      const message = await this.translationService.translate(
        'cash_register.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.cashRegisterRepository.softDelete({
      id,
      organization_id: this.organizationId,
    });
  }
}
