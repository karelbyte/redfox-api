import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { Client } from '../models/client.entity';
import { CreateWithdrawalDto } from '../dtos/withdrawal/create-withdrawal.dto';
import { UpdateWithdrawalDto } from '../dtos/withdrawal/update-withdrawal.dto';
import { WithdrawalResponseDto } from '../dtos/withdrawal/withdrawal-response.dto';
import { WithdrawalDetailResponseDto } from '../dtos/withdrawal-detail/withdrawal-detail-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { ProductService } from './product.service';
import { ProductMapper } from './mappers/product.mapper';

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WithdrawalDetail)
    private readonly withdrawalDetailRepository: Repository<WithdrawalDetail>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly productService: ProductService,
    private readonly productMapper: ProductMapper,
  ) {}

  private mapDetailToResponseDto(
    detail: WithdrawalDetail,
  ): WithdrawalDetailResponseDto {
    return {
      id: detail.id,
      quantity: detail.quantity,
      product: this.productMapper.mapToResponseDto(detail.product),
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(withdrawal: Withdrawal): WithdrawalResponseDto {
    return {
      id: withdrawal.id,
      client: withdrawal.client,
      code: withdrawal.code,
      destination: withdrawal.destination,
      status: withdrawal.status,
      details: withdrawal.details.map((detail) =>
        this.mapDetailToResponseDto(detail),
      ),
      created_at: withdrawal.created_at,
    };
  }

  async create(
    createWithdrawalDto: CreateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id: createWithdrawalDto.client_id },
    });
    if (!client) {
      throw new NotFoundException(
        `Cliente con ID ${createWithdrawalDto.client_id} no encontrado`,
      );
    }

    const withdrawal = this.withdrawalRepository.create({
      client,
    });

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    const details = await Promise.all(
      createWithdrawalDto.details.map(async (detail) => {
        const product = await this.productService.findOneEntity(
          detail.product_id,
        );
        return this.withdrawalDetailRepository.create({
          withdrawal: savedWithdrawal,
          product,
          quantity: detail.quantity,
        });
      }),
    );

    savedWithdrawal.details =
      await this.withdrawalDetailRepository.save(details);
    return this.mapToResponseDto(savedWithdrawal);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<WithdrawalResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      relations: [
        'client',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.measurement_unit',
      ],
      skip,
      take: limit,
    });

    return {
      data: withdrawals.map((withdrawal) => this.mapToResponseDto(withdrawal)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: [
        'client',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.measurement_unit',
      ],
    });

    if (!withdrawal) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada`);
    }

    return this.mapToResponseDto(withdrawal);
  }

  async update(
    id: string,
    updateWithdrawalDto: UpdateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: [
        'client',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.measurement_unit',
      ],
    });

    if (!withdrawal) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada`);
    }

    if (updateWithdrawalDto.client_id) {
      const client = await this.clientRepository.findOne({
        where: { id: updateWithdrawalDto.client_id },
      });
      if (!client) {
        throw new NotFoundException(
          `Cliente con ID ${updateWithdrawalDto.client_id} no encontrado`,
        );
      }
      withdrawal.client = client;
    }

    if (updateWithdrawalDto.details) {
      await this.withdrawalDetailRepository.delete({ withdrawal: { id } });

      const details = await Promise.all(
        updateWithdrawalDto.details.map(async (detail) => {
          const product = await this.productService.findOneEntity(
            detail.product_id,
          );
          return this.withdrawalDetailRepository.create({
            withdrawal,
            product,
            quantity: detail.quantity,
          });
        }),
      );

      withdrawal.details = await this.withdrawalDetailRepository.save(details);
    }

    const updatedWithdrawal = await this.withdrawalRepository.save(withdrawal);
    return this.mapToResponseDto(updatedWithdrawal);
  }

  async remove(id: string): Promise<void> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Salida con ID ${id} no encontrada`);
    }

    await this.withdrawalRepository.softRemove(withdrawal);
  }
}
