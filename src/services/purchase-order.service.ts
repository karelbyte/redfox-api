import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
import { TenantContext } from './tenant-context.service';
import { NotificationService } from './notification.service';
import { ReceptionService } from './reception.service';
import { EmailService } from './email.service';
import { SurrogateService } from './surrogate.service';
import { UserAttributionService } from './user-attribution.service';

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
    private readonly tenantContext: TenantContext,
    private readonly notificationService: NotificationService,
    private readonly receptionService: ReceptionService,
    private readonly emailService: EmailService,
    private readonly surrogateService: SurrogateService,
    private readonly userAttributionService: UserAttributionService,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

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

  private mapToResponseDto(
    purchaseOrder: PurchaseOrder,
  ): PurchaseOrderResponseDto {
    return {
      id: purchaseOrder.id,
      code: purchaseOrder.code,
      date: purchaseOrder.date,
      provider: purchaseOrder.provider,
      warehouse: purchaseOrder.warehouse
        ? this.warehouseMapper.mapToResponseDto(purchaseOrder.warehouse)
        : null,
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
      where: { id: purchaseOrderId, organization_id: this.organizationId },
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
    const { provider_id,  ...rest } = createPurchaseOrderDto;

    // Verificar que el proveedor existe
    const provider = await this.providerRepository.findOne({
      where: { id: provider_id, organization_id: this.organizationId },
    });
    if (!provider) {
      const message = await this.translationService.translate(
        'purchase_order.provider_not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    // Verificar que el código es único
    const existingPurchaseOrder = await this.purchaseOrderRepository.findOne({
      where: {
        code: createPurchaseOrderDto.code,
        organization_id: this.organizationId,
      },
    });
    if (existingPurchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.code_exists',
        userId,
      );
      throw new BadRequestException(message);
    }

    const purchaseOrder = this.purchaseOrderRepository.create({
      ...rest,
      provider,
      status: rest.status || 'PENDING',
      organization_id: this.organizationId,
      created_by: userId || null,
    });

    const savedPurchaseOrder =
      await this.purchaseOrderRepository.save(purchaseOrder);

    // Incrementar el contador del surrogate si el código coincide con el sugerido
    await this.surrogateService.useCodeIfMatches(
      'purchase_order',
      createPurchaseOrderDto.code,
    );

    // Notificar al usuario que creó la orden
    try {
      if (userId) {
        await this.notificationService.createOrderNotification(
          `📦 Nueva orden de compra: ${savedPurchaseOrder.code}`,
          `Se creó la orden de compra ${savedPurchaseOrder.code} con el proveedor ${provider.name}.`,
          savedPurchaseOrder.id,
          userId,
        );
      }
    } catch {
      /* no bloquear el flujo */
    }

    return this.mapToResponseDto(savedPurchaseOrder);
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<PurchaseOrderResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    let authorizedWarehouseIds: string[] | null = null;
    if (userId) {
      authorizedWarehouseIds = await this.userAttributionService.getAuthorizedWarehouseIds(userId);
    }

    const whereConditions: any = { organization_id: this.organizationId };
    if (userId && authorizedWarehouseIds !== null && authorizedWarehouseIds.length > 0) {
      whereConditions.warehouse = { id: In(authorizedWarehouseIds) };
    } else if (userId && authorizedWarehouseIds !== null) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const [purchaseOrders, total] =
      await this.purchaseOrderRepository.findAndCount({
        where: whereConditions,
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

  async findOne(
    id: string,
    userId?: string,
  ): Promise<PurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['provider', 'warehouse'],
    });

    if (!purchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(purchaseOrder);
  }

  async update(
    id: string,
    updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    userId?: string,
  ): Promise<PurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['provider', 'warehouse'],
    });

    if (!purchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    // Verificar que el código es único si se está actualizando
    if (
      updatePurchaseOrderDto.code &&
      updatePurchaseOrderDto.code !== purchaseOrder.code
    ) {
      const existingPurchaseOrder = await this.purchaseOrderRepository.findOne({
        where: {
          code: updatePurchaseOrderDto.code,
          organization_id: this.organizationId,
        },
      });
      if (existingPurchaseOrder) {
        const message = await this.translationService.translate(
          'purchase_order.code_exists',
          userId,
        );
        throw new BadRequestException(message);
      }
    }

    // Verificar proveedor si se está actualizando
    if (updatePurchaseOrderDto.provider_id) {
      const provider = await this.providerRepository.findOne({
        where: {
          id: updatePurchaseOrderDto.provider_id,
          organization_id: this.organizationId,
        },
      });
      if (!provider) {
        const message = await this.translationService.translate(
          'purchase_order.provider_not_found',
          userId,
        );
        throw new NotFoundException(message);
      }
      purchaseOrder.provider = provider;
    }

    Object.assign(purchaseOrder, updatePurchaseOrderDto);
    const updatedPurchaseOrder =
      await this.purchaseOrderRepository.save(purchaseOrder);
    return this.mapToResponseDto(updatedPurchaseOrder);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id, organization_id: this.organizationId },
    });

    if (!purchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    // Verificar que no tenga detalles antes de eliminar
    const details = await this.purchaseOrderDetailRepository.find({
      where: {
        purchaseOrder: { id, organization_id: this.organizationId },
      },
    });

    if (details.length > 0) {
      throw new BadRequestException(
        'Cannot delete purchase order with details',
      );
    }

    await this.purchaseOrderRepository.softDelete({
      id,
      organization_id: this.organizationId,
    });
  }

  async createDetail(
    purchaseOrderId: string,
    createDetailDto: CreatePurchaseOrderDetailDto,
    userId?: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId, organization_id: this.organizationId },
    });

    if (!purchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    // Verificar que el producto existe
    const product = await this.productRepository.findOne({
      where: {
        id: createDetailDto.product_id,
        organization_id: this.organizationId,
      },
    });
    if (!product) {
      const message = await this.translationService.translate(
        'purchase_order.product_not_found',
        undefined,
      );
      throw new NotFoundException(message);
    }

    // Verificar que no existe ya un detalle para este producto
    const existingDetail = await this.purchaseOrderDetailRepository.findOne({
      where: {
        purchaseOrder: {
          id: purchaseOrderId,
          organization_id: this.organizationId,
        },
        product: {
          id: createDetailDto.product_id,
          organization_id: this.organizationId,
        },
      },
    });

    if (existingDetail) {
      throw new BadRequestException(
        'Product already exists in this purchase order',
      );
    }

    // Verificar almacén destino si se especificó
    let warehouse: Warehouse | null = null;
    if (createDetailDto.warehouse_id) {
      warehouse = await this.warehouseRepository.findOne({
        where: {
          id: createDetailDto.warehouse_id,
          organization_id: this.organizationId,
        },
      });
      if (!warehouse) {
        const message = await this.translationService.translate(
          'purchase_order.warehouse_not_found',
          userId,
        );
        throw new NotFoundException(message);
      }
    }

    const detail = this.purchaseOrderDetailRepository.create({
      ...createDetailDto,
      purchaseOrder,
      product,
      warehouse: warehouse ?? undefined,
      received_quantity: 0,
    });

    const savedDetail = await this.purchaseOrderDetailRepository.save(detail);

    // Actualizar el monto total de la orden de compra
    const allDetails = await this.purchaseOrderDetailRepository.find({
      where: { purchaseOrder: { id: purchaseOrderId } },
    });

    const totalAmount = allDetails.reduce(
      (sum, detail) =>
        sum + this.calculateAmount(detail.quantity, detail.price),
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
      where: { id: purchaseOrderId, organization_id: this.organizationId },
    });

    if (!purchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    const queryBuilder = this.purchaseOrderDetailRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.measurement_unit', 'measurementUnit')
      .leftJoinAndSelect('product.prices', 'prices')
      .where('detail.purchase_order_id = :purchaseOrderId', { purchaseOrderId })
      .andWhere('detail.deleted_at IS NULL');

    if (queryDto.product_id) {
      queryBuilder.andWhere('detail.product_id = :productId', {
        productId: queryDto.product_id,
      });
    }

    const details = await queryBuilder.getMany();

    const mappedDetails = details.map((detail) =>
      this.mapDetailToResponseDto(detail),
    );

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
        purchaseOrder: {
          id: purchaseOrderId,
          organization_id: this.organizationId,
        },
      },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.measurement_unit',
        'product.prices',
      ],
    });

    if (!detail) {
      const message = await this.translationService.translate(
        'purchase_order.detail_not_found',
        userId,
      );
      throw new NotFoundException(message);
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
        purchaseOrder: {
          id: purchaseOrderId,
          organization_id: this.organizationId,
        },
      },
      relations: ['product'],
    });

    if (!detail) {
      const message = await this.translationService.translate(
        'purchase_order.detail_not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    // Verificar que la cantidad recibida no exceda la cantidad ordenada
    if (updateDetailDto.received_quantity !== undefined) {
      if (updateDetailDto.received_quantity > detail.quantity) {
        throw new BadRequestException(
          'Received quantity cannot exceed ordered quantity',
        );
      }
    }

    Object.assign(detail, updateDetailDto);
    const updatedDetail = await this.purchaseOrderDetailRepository.save(detail);

    // Actualizar el monto total de la orden de compra
    const allDetails = await this.purchaseOrderDetailRepository.find({
      where: {
        purchaseOrder: {
          id: purchaseOrderId,
          organization_id: this.organizationId,
        },
      },
    });

    const totalAmount = allDetails.reduce(
      (sum, detail) =>
        sum + this.calculateAmount(detail.quantity, detail.price),
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
        purchaseOrder: {
          id: purchaseOrderId,
          organization_id: this.organizationId,
        },
      },
    });

    if (!detail) {
      const message = await this.translationService.translate(
        'purchase_order.detail_not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    await this.purchaseOrderDetailRepository.softDelete(detailId);

    // Actualizar el monto total de la orden de compra
    const allDetails = await this.purchaseOrderDetailRepository.find({
      where: {
        purchaseOrder: {
          id: purchaseOrderId,
          organization_id: this.organizationId,
        },
      },
    });

    const totalAmount = allDetails.reduce(
      (sum, detail) =>
        sum + this.calculateAmount(detail.quantity, detail.price),
      0,
    );

    await this.updatePurchaseOrderAmount(purchaseOrderId, totalAmount);
  }

  async approvePurchaseOrder(
    purchaseOrderId: string,
    userId?: string,
    sendEmail = false,
    email?: string,
  ): Promise<ApprovePurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId, organization_id: this.organizationId },
      relations: ['provider'],
    });

    if (!purchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    if (purchaseOrder.status !== 'PENDING') {
      const message = await this.translationService.translate(
        'purchase_order.not_pending',
        userId,
      );
      throw new BadRequestException(message);
    }

    // Verificar que tenga detalles
    const details = await this.purchaseOrderDetailRepository.find({
      where: {
        purchaseOrder: {
          id: purchaseOrderId,
          organization_id: this.organizationId,
        },
      },
    });

    if (details.length === 0) {
      throw new BadRequestException(
        'Purchase order must have at least one detail',
      );
    }

    purchaseOrder.status = 'APPROVED';
    await this.purchaseOrderRepository.save(purchaseOrder);

    // Generar recepciones agrupadas por almacén destino
    try {
      const detailsWithRelations =
        await this.purchaseOrderDetailRepository.find({
          where: {
            purchaseOrder: {
              id: purchaseOrderId,
              organization_id: this.organizationId,
            },
          },
          relations: ['product', 'warehouse'],
        });

      // Agrupar detalles por warehouse_id (null = sin almacén asignado)
      const byWarehouse = new Map<string, typeof detailsWithRelations>();
      for (const d of detailsWithRelations) {
        const key = d.warehouse?.id || '__no_warehouse__';
        if (!byWarehouse.has(key)) byWarehouse.set(key, []);
        byWarehouse.get(key)!.push(d);
      }

      // Crear una recepción por cada almacén
      for (const [warehouseKey, groupDetails] of byWarehouse.entries()) {
        if (warehouseKey === '__no_warehouse__') continue; // sin almacén asignado, no crear recepción

        const warehouseId = warehouseKey;
        const receptionCode = `REC-${purchaseOrder.code}-${warehouseId.slice(0, 4).toUpperCase()}`;

        const reception = await this.receptionService.create(
          {
            code: receptionCode,
            date: new Date().toISOString().split('T')[0],
            provider_id: purchaseOrder.provider.id,
            warehouse_id: warehouseId,
            document: purchaseOrder.document || purchaseOrder.code,
            amount: groupDetails.reduce(
              (s, d) => s + Number(d.quantity) * Number(d.price),
              0,
            ),
            purchase_order_id: purchaseOrder.id,
          } as any,
          userId,
        );

        // Agregar los productos a la recepción
        for (const d of groupDetails) {
          await this.receptionService.createDetail(
            reception.id,
            {
              product_id: d.product.id,
              quantity: Number(d.quantity),
              price: Number(d.price),
            },
            userId,
          );
        }
      }
    } catch (error) {
      // No bloquear la aprobación si falla la generación de recepciones
      console.warn(
        '[PurchaseOrder] Could not generate receptions:',
        error?.message,
      );
    }

    if (sendEmail) {
      try {
        const providerEmail = purchaseOrder.provider?.email;
        if (providerEmail && userId) {
          const detailsWithRelations =
            await this.purchaseOrderDetailRepository.find({
              where: {
                purchaseOrder: {
                  id: purchaseOrder.id,
                  organization_id: this.organizationId,
                },
              },
              relations: ['product'],
            });

          const rows = detailsWithRelations
            .map(
              (d) =>
                `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${d.product?.name || '—'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${Number(d.quantity)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(d.price).toFixed(2)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${(Number(d.quantity) * Number(d.price)).toFixed(2)}</td>
            </tr>`,
            )
            .join('');

          const total = detailsWithRelations.reduce(
            (s, d) => s + Number(d.quantity) * Number(d.price),
            0,
          );

          const html = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family:Arial,sans-serif;color:#374151;margin:0;padding:0;background:#f9fafb;">
              <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <div style="background:#1e293b;padding:28px 32px;">
                  <h1 style="color:#fff;margin:0;font-size:20px;">Orden de Compra Aprobada</h1>
                  <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">Código: <strong style="color:#e2e8f0;">${purchaseOrder.code}</strong></p>
                </div>
                <div style="padding:28px 32px;">
                  <p style="margin:0 0 16px;">Estimado proveedor <strong>${purchaseOrder.provider?.name}</strong>,</p>
                  <p style="margin:0 0 24px;color:#6b7280;">Le informamos que la siguiente orden de compra ha sido aprobada y está lista para su procesamiento.</p>

                  <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                      <tr style="background:#f1f5f9;">
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;">Producto</th>
                        <th style="padding:10px 12px;text-align:center;font-weight:600;color:#475569;">Cantidad</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:600;color:#475569;">Precio</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:600;color:#475569;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                      <tr>
                        <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#1e293b;">Total:</td>
                        <td style="padding:12px;text-align:right;font-weight:700;color:#1e293b;">$${total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  ${purchaseOrder.expected_delivery_date ? `<p style="margin:20px 0 0;font-size:13px;color:#6b7280;">📅 Fecha de entrega esperada: <strong>${new Date(purchaseOrder.expected_delivery_date).toLocaleDateString('es-MX')}</strong></p>` : ''}
                  ${purchaseOrder.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">📝 Notas: ${purchaseOrder.notes}</p>` : ''}
                </div>
                <div style="background:#f8fafc;padding:16px 32px;font-size:12px;color:#94a3b8;text-align:center;">
                  Este correo fue generado automáticamente. Por favor no responda a este mensaje.
                </div>
              </div>
            </body>
            </html>
          `;

          await this.emailService.sendOrganizationEmail(this.organizationId, {
            to: providerEmail,
            subject: `Orden de Compra ${purchaseOrder.code} — Aprobada`,
            html,
          });

          console.log(
            `[PurchaseOrder] Email enviado a ${providerEmail} (Org: ${this.organizationId}) para orden ${purchaseOrder.code}`,
          );
        }
      } catch (emailError: any) {
        // No bloquear la aprobación si falla el email
        console.warn(
          `[PurchaseOrder] No se pudo enviar email al proveedor: ${emailError?.message}`,
        );
      }
    }

    return {
      id: purchaseOrder.id,
      status: purchaseOrder.status,
      message: await this.translationService.translate(
        'general.success',
        userId,
      ),
    };
  }

  async rejectPurchaseOrder(
    purchaseOrderId: string,
    userId?: string,
  ): Promise<ApprovePurchaseOrderResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId, organization_id: this.organizationId },
    });

    if (!purchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    if (purchaseOrder.status !== 'PENDING') {
      const message = await this.translationService.translate(
        'purchase_order.not_pending',
        userId,
      );
      throw new BadRequestException(message);
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
      where: { id: purchaseOrderId, organization_id: this.organizationId },
    });

    if (!purchaseOrder) {
      const message = await this.translationService.translate(
        'purchase_order.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    if (purchaseOrder.status === 'COMPLETED') {
      const message = await this.translationService.translate(
        'purchase_order.cannot_cancel_completed',
        userId,
      );
      throw new BadRequestException(message);
    }

    purchaseOrder.status = 'CANCELLED';
    await this.purchaseOrderRepository.save(purchaseOrder);

    return {
      id: purchaseOrder.id,
      status: purchaseOrder.status,
      message: await this.translationService.translate(
        'general.success',
        userId,
      ),
    };
  }
}
