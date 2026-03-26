import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  Withdrawal,
  WithdrawalType,
  WithdrawalStatus,
  PaymentMethod as WithdrawalPaymentMethod,
} from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { Client } from '../models/client.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Inventory } from '../models/inventory.entity';
import {
  CashRegister,
  CashRegisterStatus,
} from '../models/cash-register.entity';
import {
  CashTransaction,
  CashTransactionType,
  PaymentMethod,
} from '../models/cash-transaction.entity';
import {
  ProductHistory,
  OperationType,
} from '../models/product-history.entity';
import { Product, InventoryStrategy } from '../models/product.entity';
import {
  CreateWithdrawalDto,
  CreateWithdrawalDetailDto,
} from '../dtos/withdrawal/create-withdrawal.dto';
import { UpdateWithdrawalDto } from '../dtos/withdrawal/update-withdrawal.dto';
import {
  WithdrawalResponseDto,
  PackFiscalStatus,
} from '../dtos/withdrawal/withdrawal-response.dto';
import { WithdrawalDetailResponseDto } from '../dtos/withdrawal-detail/withdrawal-detail-response.dto';
import { CreateWithdrawalDetailDto as CreateDetailDto } from '../dtos/withdrawal-detail/create-withdrawal-detail.dto';
import { UpdateWithdrawalDetailDto } from '../dtos/withdrawal-detail/update-withdrawal-detail.dto';
import { WithdrawalDetailQueryDto } from '../dtos/withdrawal-detail/withdrawal-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { ProductService } from './product.service';
import { ProductMapper } from './mappers/product.mapper';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { ClientMapper } from './mappers/client.mapper';
import { CloseWithdrawalResponseDto } from '../dtos/withdrawal/close-withdrawal-response.dto';
import { TranslationService } from './translation.service';
import { PosPackSyncService } from './pos-pack-sync.service';
import { AccountReceivableService } from './account-receivable.service';
import { TenantContext } from './tenant-context.service';

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
    private readonly clientMapper: ClientMapper,
    private readonly translationService: TranslationService,
    private readonly posPackSyncService: PosPackSyncService,
    private readonly accountReceivableService: AccountReceivableService,
    private readonly tenantContext: TenantContext,
  ) { }

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  private mapDetailToResponseDto(
    detail: WithdrawalDetail,
  ): WithdrawalDetailResponseDto {
    return {
      id: detail.id,
      quantity: detail.quantity,
      price: detail.price,
      product: this.productMapper.mapToResponseDto(detail.product),
      warehouse: detail.warehouse ? this.warehouseMapper.mapToResponseDto(detail.warehouse) : null,
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(withdrawal: Withdrawal): WithdrawalResponseDto {
    let pack_fiscal_status: PackFiscalStatus = 'RECEIPT_ONLY';
    let invoice_code: string | null = null;
    let cfdi_uuid: string | null = null;
    if (withdrawal.invoiceId && withdrawal.invoice) {
      const inv = withdrawal.invoice as any;
      pack_fiscal_status =
        inv.withdrawal?.id === withdrawal.id
          ? 'INVOICED_DIRECT'
          : 'INVOICED_GLOBAL';
      invoice_code = inv.code ?? null;
      cfdi_uuid = inv.cfdi_uuid ?? null;
    }
    return {
      id: withdrawal.id,
      client: withdrawal.client
        ? this.clientMapper.mapToResponseDto(withdrawal.client)
        : null,
      code: withdrawal.code,
      destination: withdrawal.destination,
      amount: withdrawal.details?.length
        ? Math.round(
            withdrawal.details.reduce((sum, d) =>
              sum + this.calculateAmountWithTaxes(Number(d.quantity), Number(d.price), d.product?.taxes || []),
              0,
            ) * 100,
          ) / 100
        : withdrawal.amount,
      type: withdrawal.type,
      cash_transaction_id: withdrawal.cashTransactionId,
      status: withdrawal.status,
      payment_method: withdrawal.paymentMethod,
      created_at: withdrawal.created_at,
      pack_receipt_id: withdrawal.pack_receipt_id ?? null,
      invoice_id: withdrawal.invoiceId ?? null,
      pack_fiscal_status,
      invoice_code,
      cfdi_uuid,
    };
  }

  // Función helper para calcular el monto total de la withdrawal
  private calculateTotalAmount(details: CreateWithdrawalDetailDto[]): number {
    return details.reduce((total, detail) => {
      return total + detail.quantity * detail.price;
    }, 0);
  }

  // Función helper para calcular montos con precisión decimal (sin taxes)
  private calculateAmount(quantity: number, price: number): number {
    return quantity * price;
  }

  // Función helper para calcular el monto total incluyendo impuestos del producto
  private calculateAmountWithTaxes(quantity: number, price: number, taxes: import('../models/tax.entity').Tax[]): number {
    const taxMultiplier = (taxes || []).reduce((acc, tax) => {
      if (tax.type === 'PERCENTAGE') {
        return acc + Number(tax.value) / 100;
      }
      return acc;
    }, 0);
    return quantity * price * (1 + taxMultiplier);
  }

  // Función helper para actualizar el monto total de la withdrawal
  private async updateWithdrawalAmount(
    withdrawalId: string,
    newAmount: number,
  ): Promise<void> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId, organization_id: this.organizationId },
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
      where: { id: createWithdrawalDto.client_id, organization_id: this.organizationId },
      relations: ['credit'],
    });
    if (!client) {
      const message = await this.translationService.translate(
        'withdrawal.client_not_found',
        userId,
        { id: createWithdrawalDto.client_id },
      );
      throw new NotFoundException(message);
    }

    // Validar si el cliente tiene crédito activo cuando se selecciona pago a crédito
    if (createWithdrawalDto.payment_method === WithdrawalPaymentMethod.CREDIT) {
      if (!client.credit || !client.credit.is_active) {
        throw new BadRequestException('El cliente no tiene crédito activo');
      }
    }

    const withdrawal = this.withdrawalRepository.create({
      code: createWithdrawalDto.code,
      destination: createWithdrawalDto.destination,
      client,
      amount: createWithdrawalDto.amount,
      type: createWithdrawalDto.type || WithdrawalType.WITHDRAWAL,
      cashTransactionId: createWithdrawalDto.cash_transaction_id,
      status: WithdrawalStatus.OPEN,
      paymentMethod:
        createWithdrawalDto.payment_method || WithdrawalPaymentMethod.CASH,
      organization_id: this.organizationId,
    });

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    return this.mapToResponseDto(savedWithdrawal);
  }

  async findAll(
    paginationDto: PaginationDto,
    clientId?: string,
  ): Promise<PaginatedResponseDto<WithdrawalResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = { organization_id: this.organizationId };
    if (clientId) {
      where.client = { id: clientId };
    }

    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      where,
      relations: [
        'client',
        'invoice',
        'invoice.withdrawal',
        'cashTransaction',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.taxes',
        'details.product.measurement_unit',
        'details.product.prices',
        'details.warehouse',
      ],
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
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
      where: { id, organization_id: this.organizationId },
      relations: [
        'client',
        'invoice',
        'invoice.withdrawal',
        'cashTransaction',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.taxes',
        'details.product.measurement_unit',
        'details.product.prices',
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
      where: { id, organization_id: this.organizationId },
      relations: [
        'client',
        'cashTransaction',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.measurement_unit',
        'details.product.prices',
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
        where: { id: updateWithdrawalDto.client_id, organization_id: this.organizationId },
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
      withdrawal.status = updateWithdrawalDto.status as any;
    }

    const updatedWithdrawal = await this.withdrawalRepository.save(withdrawal);
    return this.mapToResponseDto(updatedWithdrawal);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id, organization_id: this.organizationId },
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
      where: { id: withdrawalId, organization_id: this.organizationId },
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

    // Para productos tangibles se requiere warehouse; service/digital no necesitan
    const isTangible = product.type === 'tangible';
    let warehouse: Warehouse | null = null;

    if (isTangible) {
      if (!createDetailDto.warehouse_id) {
        throw new BadRequestException('warehouse_id is required for tangible products');
      }
      warehouse = await this.warehouseRepository.findOne({
        where: { id: createDetailDto.warehouse_id, organization_id: this.organizationId },
      });
      if (!warehouse) {
        const message = await this.translationService.translate(
          'withdrawal.warehouse_not_found',
          userId,
          { id: createDetailDto.warehouse_id },
        );
        throw new NotFoundException(message);
      }
    }

    // Verificar si ya existe un detalle con este producto en la withdrawal
    const existingDetail = await this.withdrawalDetailRepository.findOne({
      where: {
        withdrawal: { id: withdrawalId, organization_id: this.organizationId },
        product: { id: createDetailDto.product_id },
      },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.taxes',
        'product.measurement_unit',
        'product.prices',
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
      const productTaxes = existingDetail.product?.taxes || [];
      const oldAmount = this.calculateAmountWithTaxes(oldQuantity, oldPrice, productTaxes);

      // Sumar cantidades
      const totalQuantity = oldQuantity + newQuantity;

      // Calcular precio promedio ponderado
      const totalAmount = oldQuantity * oldPrice + newQuantity * newPrice;
      const averagePrice = totalAmount / totalQuantity;

      // Actualizar el detalle existente
      existingDetail.quantity = totalQuantity;
      existingDetail.price = averagePrice;

      detailToSave = existingDetail;

      // Calcular el nuevo monto total para la withdrawal (con taxes)
      const newAmount = this.calculateAmountWithTaxes(totalQuantity, averagePrice, productTaxes);
      const currentAmount = withdrawal.amount || 0;
      const newTotalAmount = currentAmount - oldAmount + newAmount;

      await this.updateWithdrawalAmount(withdrawalId, newTotalAmount);
    } else {
      const detail = this.withdrawalDetailRepository.create({
        withdrawal: withdrawal,
        product: product,
        ...(warehouse ? { warehouse } : {}),
        quantity: createDetailDto.quantity,
        price: createDetailDto.price,
      });

      detailToSave = detail;

      // Calcular el monto del nuevo detalle (con taxes)
      const detailAmount = this.calculateAmountWithTaxes(
        createDetailDto.quantity,
        createDetailDto.price,
        product.taxes || [],
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
        'product.taxes',
        'product.measurement_unit',
        'product.prices',
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
        where: { withdrawal: { id: withdrawalId, organization_id: this.organizationId } },
        relations: [
          'product',
          'product.brand',
          'product.category',
          'product.taxes',
          'product.measurement_unit',
          'product.prices',
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
      where: {
        id: detailId,
        withdrawal: { id: withdrawalId, organization_id: this.organizationId },
      },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.taxes',
        'product.measurement_unit',
        'product.prices',
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
      where: { id: withdrawalId, organization_id: this.organizationId },
    });
    if (!withdrawal) {
      throw new NotFoundException(
        `Withdrawal with ID ${withdrawalId} not found`,
      );
    }

    const detail = await this.withdrawalDetailRepository.findOne({
      where: {
        id: detailId,
        withdrawal: { id: withdrawalId, organization_id: this.organizationId },
      },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.taxes',
        'product.measurement_unit',
        'product.prices',
        'warehouse',
      ],
    });

    if (!detail) {
      throw new NotFoundException(
        `Withdrawal detail with ID ${detailId} not found in withdrawal ${withdrawalId}`,
      );
    }

    // Guardar el monto anterior del detalle para restarlo del total (con taxes)
    const oldAmount = this.calculateAmountWithTaxes(detail.quantity, detail.price, detail.product?.taxes || []);

    if (updateDetailDto.product_id) {
      const product = await this.productService.findOneEntity(
        updateDetailDto.product_id,
      );
      detail.product = product;
    }

    if (updateDetailDto.warehouse_id) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { id: updateDetailDto.warehouse_id, organization_id: this.organizationId },
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

    // Calcular el nuevo monto del detalle (con taxes)
    const newAmount = this.calculateAmountWithTaxes(detail.quantity, detail.price, detail.product?.taxes || []);

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
      where: { id: withdrawalId, organization_id: this.organizationId },
    });
    if (!withdrawal) {
      throw new NotFoundException(
        `Withdrawal with ID ${withdrawalId} not found`,
      );
    }

    const detail = await this.withdrawalDetailRepository.findOne({
      where: {
        id: detailId,
        withdrawal: { id: withdrawalId, organization_id: this.organizationId },
      },
      relations: ['product', 'product.taxes'],
    });

    if (!detail) {
      throw new NotFoundException(
        `Withdrawal detail with ID ${detailId} not found in withdrawal ${withdrawalId}`,
      );
    }

    // Calcular el monto del detalle a eliminar con precisión decimal (con taxes)
    const detailAmount = this.calculateAmountWithTaxes(detail.quantity, detail.price, detail.product?.taxes || []);

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
      where: { id: withdrawalId, organization_id: this.organizationId },
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

    if (withdrawal.status !== WithdrawalStatus.OPEN) {
      const message = await this.translationService.translate(
        'withdrawal.already_closed',
        userId,
      );
      throw new BadRequestException(message);
    }

    // Obtener todos los detalles de la withdrawal
    const withdrawalDetails = await this.withdrawalDetailRepository.find({
      where: { withdrawal: { id: withdrawalId, organization_id: this.organizationId } },
      relations: ['product', 'warehouse'],
    });

    if (withdrawalDetails.length === 0) {
      throw new BadRequestException(
        'La withdrawal no tiene productos para retirar',
      );
    }

    let withdrawnProducts = 0;
    let totalQuantity = 0;

    for (const detail of withdrawalDetails) {
      const product = await this.productService.findOneEntity(
        detail.product.id,
      );

      // Productos service/digital no tienen inventario físico — solo registrar historia
      if (product.type !== 'tangible') {
        withdrawnProducts++;
        totalQuantity += Number(detail.quantity);
        continue;
      }

      // Para tangibles: verificar warehouse y descontar stock
      if (!detail.warehouse) {
        throw new BadRequestException(
          `Product ${product.name} is tangible but has no warehouse assigned`,
        );
      }

      const strategy = product.inventory_strategy || InventoryStrategy.AVERAGE;

      const lots = await this.inventoryRepository.find({
        where: {
          product: { id: detail.product.id },
          warehouse: { id: detail.warehouse.id },
          quantity: MoreThan(0),
          organization_id: this.organizationId,
        },
        order: {
          created_at: 'ASC',
        },
      });

      if (strategy === InventoryStrategy.FEFO) {
        lots.sort((a, b) => {
          if (!a.expiration_date) return 1;
          if (!b.expiration_date) return -1;
          const aTime = new Date(a.expiration_date).getTime();
          const bTime = new Date(b.expiration_date).getTime();
          return aTime - bTime;
        });
      } else {
        lots.sort((a, b) => {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return aTime - bTime;
        });
      }

      const totalAvailable = lots.reduce(
        (sum, lot) => sum + Number(lot.quantity),
        0,
      );
      if (totalAvailable < Number(detail.quantity)) {
        throw new BadRequestException(
          `Insufficient stock for product ${detail.product.name}. Available: ${totalAvailable}, Requested: ${detail.quantity}`,
        );
      }

      let remainingToDeduct = Number(detail.quantity);
      for (const lot of lots) {
        if (remainingToDeduct <= 0) break;

        const lotQuantity = Number(lot.quantity);
        const deduction = Math.min(lotQuantity, remainingToDeduct);

        lot.quantity = lotQuantity - deduction;
        remainingToDeduct -= deduction;

        const finalLot = await this.inventoryRepository.save(lot);

        const productHistory = this.productHistoryRepository.create({
          product: detail.product,
          warehouse: detail.warehouse,
          operation_type: OperationType.WITHDRAWAL,
          operation_id: withdrawal.id,
          quantity: deduction,
          current_stock: Number(finalLot.quantity),
          batch_number: lot.batch_number,
          expiration_date: lot.expiration_date,
          organization_id: this.organizationId,
        });

        await this.productHistoryRepository.save(productHistory);
      }

      // Update denormalized total_stock
      await this.productService.updateStock(
        detail.product.id,
        -Number(detail.quantity),
      );

      withdrawnProducts++;
      totalQuantity += Number(detail.quantity);
    }

    // Cerrar la withdrawal
    withdrawal.status = WithdrawalStatus.CLOSED;
    const closedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    // Si el pago es a crédito, crear cuenta por cobrar
    if (closedWithdrawal.paymentMethod === WithdrawalPaymentMethod.CREDIT) {
      const client = await this.clientRepository.findOne({
        where: { id: closedWithdrawal.client.id },
        relations: ['credit'],
      });

      if (client && client.credit && client.credit.is_active) {
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + client.credit.credit_days);

        await this.accountReceivableService.create({
          referenceNumber: closedWithdrawal.code,
          totalAmount: Number(closedWithdrawal.amount),
          remainingAmount: Number(closedWithdrawal.amount),
          issueDate: issueDate.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          clientId: client.id,
          notes: `Venta a crédito - ${closedWithdrawal.type}`,
        });
      }
    }

    // Si es un retiro POS, intentar crear el recibo en el PAC
    if (closedWithdrawal.type === WithdrawalType.POS) {
      await this.posPackSyncService.createReceiptForWithdrawal(
        closedWithdrawal.id,
      );
    }

    // Retornar resumen de la operación
    const resMessage =
      withdrawnProducts > 0
        ? `Withdrawal cerrada exitosamente. ${withdrawnProducts} productos retirados del inventario.`
        : 'Withdrawal cerrada exitosamente. No había productos para retirar.';

    return {
      withdrawalId: closedWithdrawal.id,
      withdrawalCode: closedWithdrawal.code,
      withdrawnProducts,
      totalQuantity,
      message: resMessage,
      closedAt: new Date(),
    };
  }

  async refundWithdrawal(
    withdrawalId: string,
    userId?: string,
  ): Promise<WithdrawalResponseDto> {
    const queryRunner =
      this.withdrawalRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawal = await queryRunner.manager.findOne(Withdrawal, {
        where: { id: withdrawalId, organization_id: this.organizationId },
        relations: [
          'client',
          'details',
          'details.product',
          'details.warehouse',
          'cashTransaction',
          'cashTransaction.cashRegister',
          'invoice',
        ],
      });

      if (!withdrawal) {
        const message = await this.translationService.translate(
          'withdrawal.not_found',
          userId,
          { id: withdrawalId },
        );
        throw new NotFoundException(message);
      }

      if (withdrawal.status === WithdrawalStatus.RETURNED) {
        throw new BadRequestException('Withdrawal is already returned');
      }

      if (withdrawal.status !== WithdrawalStatus.CLOSED) {
        throw new BadRequestException(
          'Only closed withdrawals can be returned',
        );
      }

      // Bloquear devolución si tiene factura activa (no cancelada)
      if (withdrawal.invoiceId && withdrawal.invoice) {
        const invoiceStatus = (withdrawal.invoice as any).status;
        if (invoiceStatus && invoiceStatus !== 'CANCELLED') {
          throw new BadRequestException(
            'No se puede devolver una venta con factura activa. Cancela la factura primero.',
          );
        }
      }

      // 1. Restaurar Inventario y crear ProductHistory (Kardex)
      for (const detail of withdrawal.details) {
        // service/digital no tienen warehouse — nada que restaurar
        if (!detail.warehouse) continue;

        const inventory = await queryRunner.manager.findOne(Inventory, {
          where: {
            product: { id: detail.product.id },
            warehouse: { id: detail.warehouse.id },
          },
        });

        if (inventory) {
          inventory.quantity =
            Number(inventory.quantity) + Number(detail.quantity);
          await queryRunner.manager.save(Inventory, inventory);

          const productHistory = this.productHistoryRepository.create({
            product: detail.product,
            warehouse: detail.warehouse,
            operation_type: OperationType.RETURN_IN,
            operation_id: withdrawal.id,
            quantity: Number(detail.quantity),
            current_stock: Number(inventory.quantity),
            batch_number: inventory.batch_number,
            expiration_date: inventory.expiration_date,
          });
          await queryRunner.manager.save(ProductHistory, productHistory);

          // Update denormalized total_stock
          await this.productService.updateStock(
            detail.product.id,
            Number(detail.quantity),
            queryRunner.manager,
          );
        }
      }

      // 2. Ajustar Caja (Refund Transaction)
      if (withdrawal.cashTransaction) {
        const cashRegister = withdrawal.cashTransaction.cashRegister;
        const refundAmount = Number(withdrawal.amount);

        // Crear la transacción de reembolso
        const refundTransaction = queryRunner.manager.create(CashTransaction, {
          cashRegisterId: cashRegister.id,
          type: CashTransactionType.REFUND,
          amount: refundAmount,
          description: `Refund for withdrawal ${withdrawal.code}`,
          reference: withdrawal.code,
          paymentMethod: withdrawal.cashTransaction.paymentMethod,
          saleId: withdrawal.id,
          createdBy: userId || withdrawal.cashTransaction.createdBy,
        });

        await queryRunner.manager.save(CashTransaction, refundTransaction);

        // Actualizar balance de la caja
        cashRegister.currentAmount =
          Number(cashRegister.currentAmount) - refundAmount;
        await queryRunner.manager.save(CashRegister, cashRegister);
      }

      // 3. Cancelar recibo en PAC (Facturapi)
      if (
        withdrawal.type === WithdrawalType.POS &&
        withdrawal.pack_receipt_id
      ) {
        await this.posPackSyncService.cancelReceiptForWithdrawal(withdrawal.id);
      }

      // 4. Actualizar estado a RETURNED
      withdrawal.status = WithdrawalStatus.RETURNED;
      const savedWithdrawal = await queryRunner.manager.save(
        Withdrawal,
        withdrawal,
      );

      await queryRunner.commitTransaction();
      return this.mapToResponseDto(savedWithdrawal);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
