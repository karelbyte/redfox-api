import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import { CreateWithdrawalDto } from '../dtos/withdrawal/create-withdrawal.dto';
import { UpdateWithdrawalDto } from '../dtos/withdrawal/update-withdrawal.dto';
import { WithdrawalResponseDto } from '../dtos/withdrawal/withdrawal-response.dto';
import { WithdrawalDetailResponseDto } from '../dtos/withdrawal-detail/withdrawal-detail-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WithdrawalDetail)
    private withdrawalDetailRepository: Repository<WithdrawalDetail>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  private mapDetailToResponseDto(
    detail: WithdrawalDetail,
  ): WithdrawalDetailResponseDto {
    const { id, product, quantity, created_at } = detail;
    return {
      id,
      product: {
        id: product.id,
        code: product.code,
        description: product.description,
        price: product.price,
        stock: product.stock,
        min_stock: product.min_stock,
        brand: product.brand,
        provider: product.provider,
        measurement_unit: product.measurement_unit,
        status: product.status,
        created_at: product.created_at,
      },
      quantity,
      created_at,
    };
  }

  private mapToResponseDto(withdrawal: Withdrawal): WithdrawalResponseDto {
    const { id, code, destination, client, status, details, created_at } =
      withdrawal;
    return {
      id,
      code,
      destination,
      client: {
        id: client.id,
        code: client.code,
        name: client.name,
        description: client.description,
        phone: client.phone,
        email: client.email,
        address: client.address,
        status: client.status,
        created_at: client.created_at,
      },
      status,
      details: details.map((detail) => this.mapDetailToResponseDto(detail)),
      created_at,
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
      code: createWithdrawalDto.code,
      destination: createWithdrawalDto.destination,
      client,
      status: createWithdrawalDto.status ?? true,
    });

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    const details = await Promise.all(
      createWithdrawalDto.details.map(async (detailDto) => {
        const product = await this.productRepository.findOne({
          where: { id: detailDto.product_id },
        });
        if (!product) {
          throw new NotFoundException(
            `Producto con ID ${detailDto.product_id} no encontrado`,
          );
        }

        const detail = this.withdrawalDetailRepository.create({
          withdrawal: savedWithdrawal,
          product,
          quantity: detailDto.quantity,
        });

        return this.withdrawalDetailRepository.save(detail);
      }),
    );

    savedWithdrawal.details = details;
    return this.mapToResponseDto(savedWithdrawal);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<WithdrawalResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      relations: ['client', 'details', 'details.product'],
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    const data = withdrawals.map((withdrawal) =>
      this.mapToResponseDto(withdrawal),
    );

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

  async findOne(id: string): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: ['client', 'details', 'details.product'],
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
      relations: ['client', 'details', 'details.product'],
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
        updateWithdrawalDto.details.map(async (detailDto) => {
          const product = await this.productRepository.findOne({
            where: { id: detailDto.product_id },
          });
          if (!product) {
            throw new NotFoundException(
              `Producto con ID ${detailDto.product_id} no encontrado`,
            );
          }

          const detail = this.withdrawalDetailRepository.create({
            withdrawal,
            product,
            quantity: detailDto.quantity,
          });

          return this.withdrawalDetailRepository.save(detail);
        }),
      );

      withdrawal.details = details;
    }

    Object.assign(withdrawal, {
      code: updateWithdrawalDto.code,
      destination: updateWithdrawalDto.destination,
      status: updateWithdrawalDto.status,
    });

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
