import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../models/notification.entity';
import { CreateNotificationDto } from '../dtos/notification/create-notification.dto';
import { UpdateNotificationDto } from '../dtos/notification/update-notification.dto';
import { NotificationQueryDto } from '../dtos/notification/notification-query.dto';
import { NotificationResponseDto } from '../dtos/notification/notification-response.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto, currentUserId?: string): Promise<NotificationResponseDto> {
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      userId: createNotificationDto.userId || currentUserId,
    });

    const savedNotification = await this.notificationRepository.save(notification);
    return this.mapToResponseDto(savedNotification);
  }

  async findAll(query: NotificationQueryDto, userId: string): Promise<{
    data: NotificationResponseDto[];
    meta: {
      total: number;
      unreadCount: number;
      page: number;
      totalPages: number;
    };
  }> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    // Apply filters
    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority: query.priority });
    }

    if (query.isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: query.isRead });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get unread count
    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const notifications = await queryBuilder.getMany();
    const totalPages = Math.ceil(total / limit);

    return {
      data: notifications.map(notification => this.mapToResponseDto(notification)),
      meta: {
        total,
        unreadCount,
        page,
        totalPages,
      },
    };
  }

  async findOne(id: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.mapToResponseDto(notification);
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    Object.assign(notification, updateNotificationDto);
    const updatedNotification = await this.notificationRepository.save(notification);

    return this.mapToResponseDto(updatedNotification);
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true }
    );
  }

  async deleteAllRead(userId: string): Promise<void> {
    await this.notificationRepository.delete({
      userId,
      isRead: true,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  // Utility methods for creating specific notification types
  async createSystemNotification(title: string, message: string, userId?: string): Promise<NotificationResponseDto> {
    return this.create({
      title,
      message,
      type: 'system' as any,
      priority: 'medium' as any,
      userId,
    });
  }

  async createOrderNotification(title: string, message: string, orderId: string, userId: string): Promise<NotificationResponseDto> {
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

  async createInventoryNotification(title: string, message: string, productId: string, userId: string): Promise<NotificationResponseDto> {
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

  async createSaleNotification(title: string, message: string, saleId: string, userId: string): Promise<NotificationResponseDto> {
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

  async createQuotationNotification(title: string, message: string, quotationId: string, userId: string): Promise<NotificationResponseDto> {
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

  async createInvoiceNotification(title: string, message: string, invoiceId: string, userId: string): Promise<NotificationResponseDto> {
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

  private mapToResponseDto(notification: Notification): NotificationResponseDto {
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
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }
}