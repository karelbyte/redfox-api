import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from '../models/purchase-order.entity';
import { PurchaseOrderDetail } from '../models/purchase-order-detail.entity';
import { Provider } from '../models/provider.entity';
import { Product } from '../models/product.entity';
import { Warehouse } from '../models/warehouse.entity';
import { CreatePurchaseOrderDto } from '../dtos/purchase-order/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dtos/purchase-order/update-purchase-order.dto';
import { PurchaseOrderResponseDto } from '../dtos/purchase-order/purchase-order-response.dto';
import { ApprovePurchaseOrderResponseDto } from '../dtos/purchase-order/approve-purchase-order-response.dto';
import { PurchaseOrderDetailResponseDto } from '../dtos/purchase-order-detail/purchase-order-detail-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { ProductService } from './product.service';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { ProductMapper } from './mappers/product.mapper';
import { CreatePurchaseOrderDetailDto } from '../dtos/purchase-order-detail/create-purchase-order-detail.dto';
import { UpdatePurchaseOrderDetailDto } from '../dtos/purchase-order-detail/update-purchase-order-detail.dto';
import { PurchaseOrderDetailQueryDto } from '../dtos/purchase-order-detail/purchase-order-detail-query.dto';
import { TranslationService } from './translation.service';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderDetail)
    private readonly purchaseOrderDetailRepository: Repository<PurchaseOrderDetail>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    private readonly productService: ProductService,
    private readonly warehouseMapper: WarehouseMapper,
    private readonly productMapper: ProductMapper,
    private readonly translationService: TranslationService,
  ) {}

  private mapDetailToResponseDto(
    detail: PurchaseOrderDetail,
  ): PurchaseOrderDetailResponseDto {
    return {
      id: detail.id,
      quantity: detail.quantity,
      price: detail.price,
      received_quantity: detail.received_quantity,
      product: this.productMapper.mapToResponseDto(detail.product),
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(purchaseOrder: PurchaseOrder): PurchaseOrderResponseDto {
    return {
      id: purchaseOrder.id,
      code: purchaseOrder.code,
      date: purchaseOrder.date,
      provider: purchaseOrder.provider,
      warehouse: this.warehouseMapper.mapToResponseDto(purchaseOrder.warehouse),
      document: purchaseOrder.document,
      amount: purchaseOrder.amount,
      status: purchaseOrder.status,
      notes: purchaseOrder.notes,
      expected_delivery_date: purchaseOrder.expected_delivery_date,
      created_at: purchaseOrder.created_at,
    };
  }

  // Función helper para calcular montos con precisión decimal
  private calculateAmount(quantity: number, price: number): number {
    return quantity * price;
  }

  // Función helper para actualizar el monto total de la orden de compra
  private async updatePurchaseOrderAmount(
    purchaseOrderId: string,
    newAmount: number,
  ): Promise<void> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId },
    });
    if (purchaseOrder) {
      purchaseOrder.amount = Math.round(newAmount * 100) / 100;
      await this.purchaseOrderRepository.save(purchaseOrder);
    }
  }

  async create(
    createPurchaseOrderDto: CreatePurchaseOrderDto,
    userId?: string,
  ): Promise<PurchaseOrderResponseDto> {
    const { provider_id, warehouse_id, ...rest } = createPurchaseOrderDto;

    // Verificar que el proveedor existe
    const provider = await this.providerRepository.findOne({
      where: { id: provider_id },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Verificar que el almacén existe
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouse_id },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Verificar que el código es único
    const existingPurchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { code: createPurchaseOrderDto.code },
    });
    if (existingPurchaseOrder) {
      throw new BadRequestException('Purchase order code already exists');
    }

    const purchaseOrder = this.purchaseOrderRepository.create({
      ...rest,
      provider,
      warehouse,
      status: rest.status || 'PENDING',
    });

    const savedPurchaseOrder = await this.purchaseOrderRepository.save(purchaseOrder);
    return this.mapToResponseDto(savedPurchaseOrder);
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<PurchaseOrderResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await this.purchaseOrderRepository.findAndCount({
      relations: ['provider', 'warehouse'],
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const mappedPurchaseOrders = purchaseOrders.map((purchaseOrder) =>
      this.mapToResponseDto(purchaseOrder),
    );

    return {
      data: mappedPurchaseOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<PurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
      relations: ['provider', 'warehouse'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return this.mapToResponseDto(purchaseOrder);
  }

  async update(
    id: string,
    updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    userId?: string,
  ): Promise<PurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
      relations: ['provider', 'warehouse'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    // Verificar que el código es único si se está actualizando
    if (updatePurchaseOrderDto.code && updatePurchaseOrderDto.code !== purchaseOrder.code) {
      const existingPurchaseOrder = await this.purchaseOrderRepository.findOne({
        where: { code: updatePurchaseOrderDto.code },
      });
      if (existingPurchaseOrder) {
        throw new BadRequestException('Purchase order code already exists');
      }
    }

    // Verificar proveedor si se está actualizando
    if (updatePurchaseOrderDto.provider_id) {
      const provider = await this.providerRepository.findOne({
        where: { id: updatePurchaseOrderDto.provider_id },
      });
      if (!provider) {
        throw new NotFoundException('Provider not found');
      }
      purchaseOrder.provider = provider;
    }

    // Verificar almacén si se está actualizando
    if (updatePurchaseOrderDto.warehouse_id) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { id: updatePurchaseOrderDto.warehouse_id },
      });
      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
      purchaseOrder.warehouse = warehouse;
    }

    Object.assign(purchaseOrder, updatePurchaseOrderDto);
    const updatedPurchaseOrder = await this.purchaseOrderRepository.save(purchaseOrder);
    return this.mapToResponseDto(updatedPurchaseOrder);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    // Verificar que no tenga detalles antes de eliminar
    const details = await this.purchaseOrderDetailRepository.find({
      where: { purchaseOrder: { id } },
    });

    if (details.length > 0) {
      throw new BadRequestException('Cannot delete purchase order with details');
    }

    await this.purchaseOrderRepository.softDelete(id);
  }

  async createDetail(
    purchaseOrderId: string,
    createDetailDto: CreatePurchaseOrderDetailDto,
    userId?: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    // Verificar que el producto existe
    const product = await this.productRepository.findOne({
      where: { id: createDetailDto.product_id },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verificar que no existe ya un detalle para este producto
    const existingDetail = await this.purchaseOrderDetailRepository.findOne({
      where: {
        purchaseOrder: { id: purchaseOrderId },
        product: { id: createDetailDto.product_id },
      },
    });

    if (existingDetail) {
      throw new BadRequestException('Product already exists in this purchase order');
    }

    const detail = this.purchaseOrderDetailRepository.create({
      ...createDetailDto,
      purchaseOrder,
      product,
      received_quantity: 0,
    });

    const savedDetail = await this.purchaseOrderDetailRepository.save(detail);

    // Actualizar el monto total de la orden de compra
    const allDetails = await this.purchaseOrderDetailRepository.find({
      where: { purchaseOrder: { id: purchaseOrderId } },
    });

    const totalAmount = allDetails.reduce(
      (sum, detail) => sum + this.calculateAmount(detail.quantity, detail.price),
      0,
    );

    await this.updatePurchaseOrderAmount(purchaseOrderId, totalAmount);

    return this.mapDetailToResponseDto(savedDetail);
  }

  async findAllDetails(
    purchaseOrderId: string,
    queryDto: PurchaseOrderDetailQueryDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<PurchaseOrderDetailResponseDto>> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    const queryBuilder = this.purchaseOrderDetailRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.measurementUnit', 'measurementUnit')
      .where('detail.purchaseOrder.id = :purchaseOrderId', { purchaseOrderId });

    if (queryDto.product_id) {
      queryBuilder.andWhere('detail.product.id = :productId', {
        productId: queryDto.product_id,
      });
    }

    const details = await queryBuilder.getMany();

    const mappedDetails = details.map((detail) => this.mapDetailToResponseDto(detail));

    return {
      data: mappedDetails,
      meta: {
        total: details.length,
        page: 1,
        limit: details.length,
        totalPages: 1,
      },
    };
  }

  async findOneDetail(
    purchaseOrderId: string,
    detailId: string,
    userId?: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    const detail = await this.purchaseOrderDetailRepository.findOne({
      where: {
        id: detailId,
        purchaseOrder: { id: purchaseOrderId },
      },
      relations: ['product', 'product.brand', 'product.category', 'product.measurementUnit'],
    });

    if (!detail) {
      throw new NotFoundException('Purchase order detail not found');
    }

    return this.mapDetailToResponseDto(detail);
  }

  async updateDetail(
    purchaseOrderId: string,
    detailId: string,
    updateDetailDto: UpdatePurchaseOrderDetailDto,
    userId?: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    const detail = await this.purchaseOrderDetailRepository.findOne({
      where: {
        id: detailId,
        purchaseOrder: { id: purchaseOrderId },
      },
      relations: ['product'],
    });

    if (!detail) {
      throw new NotFoundException('Purchase order detail not found');
    }

    // Verificar que la cantidad recibida no exceda la cantidad ordenada
    if (updateDetailDto.received_quantity !== undefined) {
      if (updateDetailDto.received_quantity > detail.quantity) {
        throw new BadRequestException('Received quantity cannot exceed ordered quantity');
      }
    }

    Object.assign(detail, updateDetailDto);
    const updatedDetail = await this.purchaseOrderDetailRepository.save(detail);

    // Actualizar el monto total de la orden de compra
    const allDetails = await this.purchaseOrderDetailRepository.find({
      where: { purchaseOrder: { id: purchaseOrderId } },
    });

    const totalAmount = allDetails.reduce(
      (sum, detail) => sum + this.calculateAmount(detail.quantity, detail.price),
      0,
    );

    await this.updatePurchaseOrderAmount(purchaseOrderId, totalAmount);

    return this.mapDetailToResponseDto(updatedDetail);
  }

  async removeDetail(
    purchaseOrderId: string,
    detailId: string,
    userId?: string,
  ): Promise<void> {
    const detail = await this.purchaseOrderDetailRepository.findOne({
      where: {
        id: detailId,
        purchaseOrder: { id: purchaseOrderId },
      },
    });

    if (!detail) {
      throw new NotFoundException('Purchase order detail not found');
    }

    await this.purchaseOrderDetailRepository.softDelete(detailId);

    // Actualizar el monto total de la orden de compra
    const allDetails = await this.purchaseOrderDetailRepository.find({
      where: { purchaseOrder: { id: purchaseOrderId } },
    });

    const totalAmount = allDetails.reduce(
      (sum, detail) => sum + this.calculateAmount(detail.quantity, detail.price),
      0,
    );

    await this.updatePurchaseOrderAmount(purchaseOrderId, totalAmount);
  }

  async approvePurchaseOrder(
    purchaseOrderId: string,
    userId?: string,
  ): Promise<ApprovePurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== 'PENDING') {
      throw new BadRequestException('Purchase order is not in pending status');
    }

    // Verificar que tenga detalles
    const details = await this.purchaseOrderDetailRepository.find({
      where: { purchaseOrder: { id: purchaseOrderId } },
    });

    if (details.length === 0) {
      throw new BadRequestException('Purchase order must have at least one detail');
    }

    purchaseOrder.status = 'APPROVED';
    await this.purchaseOrderRepository.save(purchaseOrder);

    return {
      id: purchaseOrder.id,
      status: purchaseOrder.status,
      message: 'Purchase order approved successfully',
    };
  }

  async rejectPurchaseOrder(
    purchaseOrderId: string,
    userId?: string,
  ): Promise<ApprovePurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== 'PENDING') {
      throw new BadRequestException('Purchase order is not in pending status');
    }

    purchaseOrder.status = 'REJECTED';
    await this.purchaseOrderRepository.save(purchaseOrder);

    return {
      id: purchaseOrder.id,
      status: purchaseOrder.status,
      message: 'Purchase order rejected successfully',
    };
  }

  async cancelPurchaseOrder(
    purchaseOrderId: string,
    userId?: string,
  ): Promise<ApprovePurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed purchase order');
    }

    purchaseOrder.status = 'CANCELLED';
    await this.purchaseOrderRepository.save(purchaseOrder);

    return {
      id: purchaseOrder.id,
      status: purchaseOrder.status,
      message: 'Purchase order cancelled successfully',
    };
  }
} 