import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal, WithdrawalType } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { Client } from '../models/client.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Inventory } from '../models/inventory.entity';
import {
  ProductHistory,
  OperationType,
} from '../models/product-history.entity';
import {
  CreateWithdrawalDto,
  CreateWithdrawalDetailDto,
} from '../dtos/withdrawal/create-withdrawal.dto';
import { UpdateWithdrawalDto } from '../dtos/withdrawal/update-withdrawal.dto';
import { WithdrawalResponseDto } from '../dtos/withdrawal/withdrawal-response.dto';
import { WithdrawalDetailResponseDto } from '../dtos/withdrawal-detail/withdrawal-detail-response.dto';
import { CreateWithdrawalDetailDto as CreateDetailDto } from '../dtos/withdrawal-detail/create-withdrawal-detail.dto';
import { UpdateWithdrawalDetailDto } from '../dtos/withdrawal-detail/update-withdrawal-detail.dto';
import { WithdrawalDetailQueryDto } from '../dtos/withdrawal-detail/withdrawal-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { ProductService } from './product.service';
import { ProductMapper } from './mappers/product.mapper';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { CloseWithdrawalResponseDto } from '../dtos/withdrawal/close-withdrawal-response.dto';
import { TranslationService } from './translation.service';
import { PosPackSyncService } from './pos-pack-sync.service';

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WithdrawalDetail)
    private readonly withdrawalDetailRepository: Repository<WithdrawalDetail>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(ProductHistory)
    private readonly productHistoryRepository: Repository<ProductHistory>,
    private readonly productService: ProductService,
    private readonly productMapper: ProductMapper,
    private readonly warehouseMapper: WarehouseMapper,
    private readonly translationService: TranslationService,
    private readonly posPackSyncService: PosPackSyncService,
  ) {}

  private mapDetailToResponseDto(
    detail: WithdrawalDetail,
  ): WithdrawalDetailResponseDto {
    return {
      id: detail.id,
      quantity: detail.quantity,
      price: detail.price,
      product: this.productMapper.mapToResponseDto(detail.product),
      warehouse: this.warehouseMapper.mapToResponseDto(detail.warehouse),
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(withdrawal: Withdrawal): WithdrawalResponseDto {
    return {
      id: withdrawal.id,
      client: withdrawal.client,
      code: withdrawal.code,
      destination: withdrawal.destination,
      amount: withdrawal.amount,
      type: withdrawal.type,
      cash_transaction_id: withdrawal.cashTransactionId,
      status: withdrawal.status,
      created_at: withdrawal.created_at,
      pack_receipt_id: withdrawal.pack_receipt_id ?? null,
    };
  }

  // Función helper para calcular el monto total de la withdrawal
  private calculateTotalAmount(details: CreateWithdrawalDetailDto[]): number {
    return details.reduce((total, detail) => {
      return total + detail.quantity * detail.price;
    }, 0);
  }

  // Función helper para calcular montos con precisión decimal
  private calculateAmount(quantity: number, price: number): number {
    return quantity * price;
  }

  // Función helper para actualizar el monto total de la withdrawal
  private async updateWithdrawalAmount(
    withdrawalId: string,
    newAmount: number,
  ): Promise<void> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (withdrawal) {
      withdrawal.amount = Math.round(newAmount * 100) / 100;
      await this.withdrawalRepository.save(withdrawal);
    }
  }

  async create(
    createWithdrawalDto: CreateWithdrawalDto,
    userId?: string,
  ): Promise<WithdrawalResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id: createWithdrawalDto.client_id },
    });
    if (!client) {
      const message = await this.translationService.translate(
        'withdrawal.client_not_found',
        userId,
        { id: createWithdrawalDto.client_id },
      );
      throw new NotFoundException(message);
    }

    const withdrawal = this.withdrawalRepository.create({
      code: createWithdrawalDto.code,
      destination: createWithdrawalDto.destination,
      client,
      amount: createWithdrawalDto.amount,
      type: createWithdrawalDto.type || WithdrawalType.WITHDRAWAL,
      cashTransactionId: createWithdrawalDto.cash_transaction_id,
      status: false,
    });

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);

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
        'cashTransaction',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.measurement_unit',
        'details.warehouse',
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

  async findOne(id: string, userId?: string): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: [
        'client',
        'cashTransaction',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.measurement_unit',
        'details.warehouse',
      ],
    });

    if (!withdrawal) {
      const message = await this.translationService.translate(
        'withdrawal.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(withdrawal);
  }

  async update(
    id: string,
    updateWithdrawalDto: UpdateWithdrawalDto,
    userId?: string,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: [
        'client',
        'cashTransaction',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.measurement_unit',
        'details.warehouse',
      ],
    });

    if (!withdrawal) {
      const message = await this.translationService.translate(
        'withdrawal.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    if (updateWithdrawalDto.client_id) {
      const client = await this.clientRepository.findOne({
        where: { id: updateWithdrawalDto.client_id },
      });
      if (!client) {
        const message = await this.translationService.translate(
          'withdrawal.client_not_found',
          userId,
          { id: updateWithdrawalDto.client_id },
        );
        throw new NotFoundException(message);
      }
      withdrawal.client = client;
    }

    // Actualizar campos básicos del withdrawal
    if (updateWithdrawalDto.code !== undefined) {
      withdrawal.code = updateWithdrawalDto.code;
    }
    if (updateWithdrawalDto.destination !== undefined) {
      withdrawal.destination = updateWithdrawalDto.destination;
    }
    if (updateWithdrawalDto.amount !== undefined) {
      withdrawal.amount = updateWithdrawalDto.amount;
    }
    if (updateWithdrawalDto.type !== undefined) {
      withdrawal.type = updateWithdrawalDto.type;
    }
    if (updateWithdrawalDto.cash_transaction_id !== undefined) {
      withdrawal.cashTransactionId = updateWithdrawalDto.cash_transaction_id;
    }
    if (updateWithdrawalDto.status !== undefined) {
      withdrawal.status = updateWithdrawalDto.status;
    }

    const updatedWithdrawal = await this.withdrawalRepository.save(withdrawal);
    return this.mapToResponseDto(updatedWithdrawal);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
    });

    if (!withdrawal) {
      const message = await this.translationService.translate(
        'withdrawal.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.withdrawalRepository.softRemove(withdrawal);
  }

  // Métodos para detalles de withdrawal
  async createDetail(
    withdrawalId: string,
    createDetailDto: CreateDetailDto,
    userId?: string,
  ): Promise<WithdrawalDetailResponseDto> {
    // Verificar que la withdrawal existe
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      const message = await this.translationService.translate(
        'withdrawal.not_found',
        userId,
        { id: withdrawalId },
      );
      throw new NotFoundException(message);
    }

    // Verificar que el producto existe
    const product = await this.productService.findOneEntity(
      createDetailDto.product_id,
    );

    // Verificar que el warehouse existe
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: createDetailDto.warehouse_id },
    });
    if (!warehouse) {
      const message = await this.translationService.translate(
        'withdrawal.warehouse_not_found',
        userId,
        { id: createDetailDto.warehouse_id },
      );
      throw new NotFoundException(message);
    }

    // Verificar si ya existe un detalle con este producto en la withdrawal
    const existingDetail = await this.withdrawalDetailRepository.findOne({
      where: {
        withdrawal: { id: withdrawalId },
        product: { id: createDetailDto.product_id },
      },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'warehouse',
      ],
    });

    let detailToSave: WithdrawalDetail;

    if (existingDetail) {
      // El producto ya existe, actualizar cantidad y promediar precio
      const oldQuantity = Number(existingDetail.quantity);
      const oldPrice = Number(existingDetail.price);
      const newQuantity = Number(createDetailDto.quantity);
      const newPrice = Number(createDetailDto.price);

      // Calcular el monto anterior para restarlo del total
      const oldAmount = this.calculateAmount(oldQuantity, oldPrice);

      // Sumar cantidades
      const totalQuantity = oldQuantity + newQuantity;

      // Calcular precio promedio ponderado
      const totalAmount = oldQuantity * oldPrice + newQuantity * newPrice;
      const averagePrice = totalAmount / totalQuantity;

      // Actualizar el detalle existente
      existingDetail.quantity = totalQuantity;
      existingDetail.price = averagePrice;

      detailToSave = existingDetail;

      // Calcular el nuevo monto total para la withdrawal
      const newAmount = this.calculateAmount(totalQuantity, averagePrice);
      const currentAmount = withdrawal.amount || 0;
      const newTotalAmount = currentAmount - oldAmount + newAmount;

      await this.updateWithdrawalAmount(withdrawalId, newTotalAmount);
    } else {
      const detail = this.withdrawalDetailRepository.create({
        withdrawal: withdrawal,
        product: product,
        warehouse: warehouse,
        quantity: createDetailDto.quantity,
        price: createDetailDto.price,
      });

      detailToSave = detail;

      // Calcular el monto del nuevo detalle
      const detailAmount = this.calculateAmount(
        createDetailDto.quantity,
        createDetailDto.price,
      );

      // Actualizar el monto total de la withdrawal
      const currentAmount = withdrawal.amount || 0;
      const newTotalAmount = Number(currentAmount) + Number(detailAmount);

      await this.updateWithdrawalAmount(withdrawalId, newTotalAmount);
    }

    const savedDetail =
      await this.withdrawalDetailRepository.save(detailToSave);

    // Recargar con relaciones para la respuesta
    const detailWithRelations = await this.withdrawalDetailRepository.findOne({
      where: { id: savedDetail.id },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'warehouse',
      ],
    });

    if (!detailWithRelations) {
      throw new NotFoundException('Withdrawal detail not found after creation');
    }

    return this.mapDetailToResponseDto(detailWithRelations);
  }

  async findAllDetails(
    withdrawalId: string,
    queryDto: WithdrawalDetailQueryDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<WithdrawalDetailResponseDto>> {
    // Verificar que la withdrawal existe
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      const message = await this.translationService.translate(
        'withdrawal.not_found',
        userId,
        { id: withdrawalId },
      );
      throw new NotFoundException(message);
    }

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const [details, total] = await this.withdrawalDetailRepository.findAndCount(
      {
        where: { withdrawal: { id: withdrawalId } },
        relations: [
          'product',
          'product.brand',
          'product.category',
          'product.tax',
          'product.measurement_unit',
          'warehouse',
        ],
        skip,
        take: limit,
        order: {
          created_at: 'DESC',
        },
      },
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: details.map((detail) => this.mapDetailToResponseDto(detail)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOneDetail(
    withdrawalId: string,
    detailId: string,
    userId?: string,
  ): Promise<WithdrawalDetailResponseDto> {
    // Verificar que la withdrawal existe
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      const message = await this.translationService.translate(
        'withdrawal.not_found',
        userId,
        { id: withdrawalId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.withdrawalDetailRepository.findOne({
      where: { id: detailId, withdrawal: { id: withdrawalId } },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'warehouse',
      ],
    });

    if (!detail) {
      throw new NotFoundException(
        `Withdrawal detail with ID ${detailId} not found in withdrawal ${withdrawalId}`,
      );
    }

    return this.mapDetailToResponseDto(detail);
  }

  async updateDetail(
    withdrawalId: string,
    detailId: string,
    updateDetailDto: UpdateWithdrawalDetailDto,
  ): Promise<WithdrawalDetailResponseDto> {
    // Verificar que la withdrawal existe
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      throw new NotFoundException(
        `Withdrawal with ID ${withdrawalId} not found`,
      );
    }

    const detail = await this.withdrawalDetailRepository.findOne({
      where: { id: detailId, withdrawal: { id: withdrawalId } },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'warehouse',
      ],
    });

    if (!detail) {
      throw new NotFoundException(
        `Withdrawal detail with ID ${detailId} not found in withdrawal ${withdrawalId}`,
      );
    }

    // Guardar el monto anterior del detalle para restarlo del total
    const oldAmount = this.calculateAmount(detail.quantity, detail.price);

    if (updateDetailDto.product_id) {
      const product = await this.productService.findOneEntity(
        updateDetailDto.product_id,
      );
      detail.product = product;
    }

    if (updateDetailDto.warehouse_id) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { id: updateDetailDto.warehouse_id },
      });
      if (!warehouse) {
        throw new NotFoundException(
          `Warehouse with ID ${updateDetailDto.warehouse_id} not found`,
        );
      }
      detail.warehouse = warehouse;
    }

    // Actualizar los campos del detalle
    if (updateDetailDto.quantity !== undefined) {
      detail.quantity = updateDetailDto.quantity;
    }
    if (updateDetailDto.price !== undefined) {
      detail.price = updateDetailDto.price;
    }

    const updatedDetail = await this.withdrawalDetailRepository.save(detail);

    // Calcular el nuevo monto del detalle
    const newAmount = this.calculateAmount(detail.quantity, detail.price);

    // Actualizar el monto total de la withdrawal: restar el monto anterior y sumar el nuevo
    const currentAmount = withdrawal.amount || 0;
    const newTotalAmount =
      Number(currentAmount) - Number(oldAmount) + Number(newAmount);
    await this.updateWithdrawalAmount(withdrawalId, newTotalAmount);

    return this.mapDetailToResponseDto(updatedDetail);
  }

  async removeDetail(withdrawalId: string, detailId: string): Promise<void> {
    // Verificar que la withdrawal existe
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      throw new NotFoundException(
        `Withdrawal with ID ${withdrawalId} not found`,
      );
    }

    const detail = await this.withdrawalDetailRepository.findOne({
      where: { id: detailId, withdrawal: { id: withdrawalId } },
    });

    if (!detail) {
      throw new NotFoundException(
        `Withdrawal detail with ID ${detailId} not found in withdrawal ${withdrawalId}`,
      );
    }

    // Calcular el monto del detalle a eliminar con precisión decimal
    const detailAmount = this.calculateAmount(detail.quantity, detail.price);

    // Restar el monto del detalle del total de la withdrawal
    const currentAmount = withdrawal.amount || 0;
    const newTotalAmount = Number(currentAmount) - Number(detailAmount);
    await this.updateWithdrawalAmount(withdrawalId, newTotalAmount);

    // Eliminar el detalle
    await this.withdrawalDetailRepository.softDelete(detailId);
  }

  async closeWithdrawal(
    withdrawalId: string,
    userId?: string,
  ): Promise<CloseWithdrawalResponseDto> {
    // Verificar que la withdrawal existe y está abierta
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['client', 'details', 'details.product', 'details.warehouse'],
    });

    if (!withdrawal) {
      const message = await this.translationService.translate(
        'withdrawal.not_found',
        userId,
        { id: withdrawalId },
      );
      throw new NotFoundException(message);
    }

    if (withdrawal.status) {
      const message = await this.translationService.translate(
        'withdrawal.already_closed',
        userId,
      );
      throw new BadRequestException(message);
    }

    // Obtener todos los detalles de la withdrawal
    const withdrawalDetails = await this.withdrawalDetailRepository.find({
      where: { withdrawal: { id: withdrawalId } },
      relations: ['product', 'warehouse'],
    });

    if (withdrawalDetails.length === 0) {
      throw new BadRequestException(
        'La withdrawal no tiene productos para retirar',
      );
    }

    let withdrawnProducts = 0;
    let totalQuantity = 0;

    // Procesar cada producto de la withdrawal
    for (const detail of withdrawalDetails) {
      // Buscar si el producto existe en inventory
      const existingInventory = await this.inventoryRepository.findOne({
        where: {
          product: { id: detail.product.id },
          warehouse: { id: detail.warehouse.id },
        },
        relations: ['product', 'warehouse'],
      });

      if (!existingInventory) {
        throw new BadRequestException(
          `Producto ${detail.product.name} no existe en el inventario del almacén ${detail.warehouse.name}`,
        );
      }

      // Verificar que hay suficiente stock
      if (Number(existingInventory.quantity) < Number(detail.quantity)) {
        throw new BadRequestException(
          `Stock insuficiente para el producto ${detail.product.name}. Disponible: ${existingInventory.quantity}, Solicitado: ${detail.quantity}`,
        );
      }

      // Descontar la cantidad del inventario
      existingInventory.quantity =
        Number(existingInventory.quantity) - Number(detail.quantity);

      // Si el stock llega a 0, mantener el precio actual
      // Si no, el precio se mantiene igual
      const finalInventory =
        await this.inventoryRepository.save(existingInventory);

      // Crear registro en ProductHistory
      const productHistory = this.productHistoryRepository.create({
        product: detail.product,
        warehouse: detail.warehouse,
        operation_type: OperationType.WITHDRAWAL,
        operation_id: withdrawal.id,
        quantity: Number(detail.quantity),
        current_stock: Number(finalInventory.quantity),
      });

      await this.productHistoryRepository.save(productHistory);

      withdrawnProducts++;
      totalQuantity += Number(detail.quantity);
    }

    // Cerrar la withdrawal
    withdrawal.status = true;
    const closedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    // Si es un retiro POS, intentar crear el recibo en el PAC
    if (closedWithdrawal.type === WithdrawalType.POS) {
      await this.posPackSyncService.createReceiptForWithdrawal(
        closedWithdrawal.id,
      );
    }

    // Retornar resumen de la operación
    const message =
      withdrawnProducts > 0
        ? `Withdrawal cerrada exitosamente. ${withdrawnProducts} productos retirados del inventario.`
        : 'Withdrawal cerrada exitosamente. No había productos para retirar.';

    return {
      withdrawalId: closedWithdrawal.id,
      withdrawalCode: closedWithdrawal.code,
      withdrawnProducts,
      totalQuantity,
      message,
      closedAt: new Date(),
    };
  }
}
