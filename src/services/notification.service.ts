import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../models/notification.entity';
import { CreateNotificationDto } from '../dtos/notification/create-notification.dto';
import { UpdateNotificationDto } from '../dtos/notification/update-notification.dto';
import { NotificationQueryDto } from '../dtos/notification/notification-query.dto';
import { NotificationResponseDto } from '../dtos/notification/notification-response.dto';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
    currentUserId?: string,
  ): Promise<NotificationResponseDto> {
    const organizationId = createNotificationDto.organization_id || this.tenantContext.getOrganizationId();
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      userId: createNotificationDto.userId || currentUserId,
      ...(organizationId && { organization_id: organizationId }),
    });

    const savedNotification =
      await this.notificationRepository.save(notification);
    return this.mapToResponseDto(savedNotification);
  }

  async findAll(
    query: NotificationQueryDto,
    userId: string,
  ): Promise<{
    data: NotificationResponseDto[];
    meta: {
      total: number;
      unreadCount: number;
      page: number;
      totalPages: number;
    };
  }> {
    const organizationId = this.tenantContext.getOrganizationId();

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (organizationId) {
      queryBuilder.andWhere('notification.organization_id = :organizationId', {
        organizationId,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.priority) {
      queryBuilder.andWhere('notification.priority = :priority', {
        priority: query.priority,
      });
    }

    if (query.isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', {
        isRead: query.isRead,
      });
    }

    const total = await queryBuilder.getCount();

    const unreadWhere: any = { userId, isRead: false };
    if (organizationId) unreadWhere.organization_id = organizationId;
    const unreadCount = await this.notificationRepository.count({
      where: unreadWhere,
    });

    const page = query.page || 1;
    const limit = query.limit || 20;
    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const notifications = await queryBuilder.getMany();

    return {
      data: notifications.map((n) => this.mapToResponseDto(n)),
      meta: { total, unreadCount, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      const message = await this.translationService.translate(
        'notification.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(notification);
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      const message = await this.translationService.translate(
        'notification.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    Object.assign(notification, updateNotificationDto);
    const updatedNotification =
      await this.notificationRepository.save(notification);

    return this.mapToResponseDto(updatedNotification);
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      const message = await this.translationService.translate(
        'notification.not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    await this.notificationRepository.remove(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const organizationId = this.tenantContext.getOrganizationId();
    const where: any = { userId, isRead: false };
    if (organizationId) where.organization_id = organizationId;
    await this.notificationRepository.update(where, { isRead: true });
  }

  async deleteAllRead(userId: string): Promise<void> {
    const organizationId = this.tenantContext.getOrganizationId();
    const where: any = { userId, isRead: true };
    if (organizationId) where.organization_id = organizationId;
    await this.notificationRepository.delete(where);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const organizationId = this.tenantContext.getOrganizationId();
    const where: any = { userId, isRead: false };
    if (organizationId) where.organization_id = organizationId;
    return this.notificationRepository.count({ where });
  }

  // Utility methods for creating specific notification types
  async createSystemNotification(
    title: string,
    message: string,
    userId?: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      title,
      message,
      type: 'system' as any,
      priority: 'medium' as any,
      userId,
    });
  }

  async createOrderNotification(
    title: string,
    message: string,
    orderId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      title,
      message,
      type: 'order' as any,
      priority: 'medium' as any,
      userId,
      actionUrl: `/dashboard/ordenes-de-compra/${orderId}`,
      actionLabel: 'Ver Orden',
      metadata: { orderId },
    });
  }

  async createInventoryNotification(
    title: string,
    message: string,
    productId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      title,
      message,
      type: 'inventory' as any,
      priority: 'high' as any,
      userId,
      actionUrl: '/dashboard/inventarios',
      actionLabel: 'Ver Inventario',
      metadata: { productId },
    });
  }

  async createSaleNotification(
    title: string,
    message: string,
    saleId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      title,
      message,
      type: 'sale' as any,
      priority: 'medium' as any,
      userId,
      actionUrl: `/dashboard/ventas/${saleId}`,
      actionLabel: 'Ver Venta',
      metadata: { saleId },
    });
  }

  async createQuotationNotification(
    title: string,
    message: string,
    quotationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      title,
      message,
      type: 'quotation' as any,
      priority: 'medium' as any,
      userId,
      actionUrl: `/dashboard/cotizaciones/${quotationId}`,
      actionLabel: 'Ver Cotización',
      metadata: { quotationId },
    });
  }

  async createInvoiceNotification(
    title: string,
    message: string,
    invoiceId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      title,
      message,
      type: 'invoice' as any,
      priority: 'high' as any,
      userId,
      actionUrl: `/dashboard/facturas/${invoiceId}`,
      actionLabel: 'Ver Factura',
      metadata: { invoiceId },
    });
  }

  private mapToResponseDto(
    notification: Notification,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      isRead: notification.isRead,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      metadata: notification.metadata,
      userId: notification.userId,
      createdAt:
        typeof notification.createdAt === 'string'
          ? notification.createdAt
          : notification.createdAt.toISOString(),
      updatedAt:
        typeof notification.updatedAt === 'string'
          ? notification.updatedAt
          : notification.updatedAt.toISOString(),
    };
  }
}
