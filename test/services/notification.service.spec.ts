import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from '../../src/services/notification.service';
import { Notification, NotificationType, NotificationPriority } from '../../src/models/notification.entity';
import { CreateNotificationDto } from '../../src/dtos/notification/create-notification.dto';
import { UpdateNotificationDto } from '../../src/dtos/notification/update-notification.dto';
import { NotificationQueryDto } from '../../src/dtos/notification/notification-query.dto';
import { TenantContext } from '../../src/services/tenant-context.service';
import { TranslationService } from '../../src/services/translation.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let tenantContext: jest.Mocked<TenantContext>;
  let translationService: jest.Mocked<TranslationService>;

  const mockNotification = {
    id: 'notification-1',
    title: 'Test Notification',
    message: 'Test message',
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.MEDIUM,
    isRead: false,
    actionUrl: '/dashboard',
    actionLabel: 'View',
    metadata: { key: 'value' },
    userId: 'user-1',
    organization_id: 'org-1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as any;

  const mockCreateNotificationDto: CreateNotificationDto = {
    title: 'New Notification',
    message: 'New message',
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.MEDIUM,
    userId: 'user-1',
    organization_id: 'org-1',
  };

  const mockUpdateNotificationDto: UpdateNotificationDto = {
    isRead: true,
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repository
    notificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    } as any;

    // Mock tenant context
    tenantContext = {
      getOrganizationId: jest.fn().mockReturnValue('org-1'),
    } as any;

    // Mock translation service
    translationService = {
      translate: jest.fn().mockResolvedValue('Notification not found'),
    } as any;

    // Create service instance
    service = new NotificationService(
      notificationRepository,
      tenantContext,
      translationService,
    );
  });

  describe('create', () => {
    it('should create notification successfully', async () => {
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.create(mockCreateNotificationDto);

      expect(notificationRepository.create).toHaveBeenCalledWith({
        ...mockCreateNotificationDto,
        userId: mockCreateNotificationDto.userId,
        organization_id: 'org-1',
      });
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockNotification.id,
        title: mockNotification.title,
        message: mockNotification.message,
        type: mockNotification.type,
        priority: mockNotification.priority,
        isRead: mockNotification.isRead,
        actionUrl: mockNotification.actionUrl,
        actionLabel: mockNotification.actionLabel,
        metadata: mockNotification.metadata,
        userId: mockNotification.userId,
        createdAt: mockNotification.createdAt.toISOString(),
        updatedAt: mockNotification.updatedAt.toISOString(),
      });
    });

    it('should use currentUserId when userId not provided', async () => {
      const dtoWithoutUserId = { ...mockCreateNotificationDto, userId: undefined };
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      await service.create(dtoWithoutUserId, 'current-user-1');

      expect(notificationRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutUserId,
        userId: 'current-user-1',
        organization_id: 'org-1',
      });
    });

    it('should use tenant context organizationId when not provided', async () => {
      const dtoWithoutOrg = { ...mockCreateNotificationDto, organization_id: undefined };
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      await service.create(dtoWithoutOrg);

      expect(notificationRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutOrg,
        userId: dtoWithoutOrg.userId,
        organization_id: 'org-1',
      });
    });

    it('should handle Date objects correctly in response', async () => {
      const notificationWithStringDates = {
        ...mockNotification,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      notificationRepository.create.mockReturnValue(notificationWithStringDates);
      notificationRepository.save.mockResolvedValue(notificationWithStringDates);

      const result = await service.create(mockCreateNotificationDto);

      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('findAll', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockNotification]),
    };

    beforeEach(() => {
      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      notificationRepository.count.mockResolvedValue(0);
    });

    it('should return paginated notifications', async () => {
      const query: NotificationQueryDto = {};
      const userId = 'user-1';

      const result = await service.findAll(query, userId);

      expect(notificationRepository.createQueryBuilder).toHaveBeenCalledWith('notification');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('notification.userId = :userId', { userId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.organization_id = :organizationId', {
        organizationId: 'org-1',
      });
      expect(result).toEqual({
        data: [{
          id: mockNotification.id,
          title: mockNotification.title,
          message: mockNotification.message,
          type: mockNotification.type,
          priority: mockNotification.priority,
          isRead: mockNotification.isRead,
          actionUrl: mockNotification.actionUrl,
          actionLabel: mockNotification.actionLabel,
          metadata: mockNotification.metadata,
          userId: mockNotification.userId,
          createdAt: mockNotification.createdAt.toISOString(),
          updatedAt: mockNotification.updatedAt.toISOString(),
        }],
        meta: {
          total: 1,
          unreadCount: 0,
          page: 1,
          totalPages: 1,
        },
      });
    });

    it('should filter by type', async () => {
      const query: NotificationQueryDto = { type: 'system' };

      await service.findAll(query, 'user-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.type = :type', { type: 'system' });
    });

    it('should filter by priority', async () => {
      const query: NotificationQueryDto = { priority: 'high' };

      await service.findAll(query, 'user-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.priority = :priority', {
        priority: 'high',
      });
    });

    it('should filter by read status', async () => {
      const query: NotificationQueryDto = { isRead: true };

      await service.findAll(query, 'user-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.isRead = :isRead', {
        isRead: true,
      });
    });

    it('should apply pagination correctly', async () => {
      const query: NotificationQueryDto = { page: 2, limit: 10 };

      await service.findAll(query, 'user-1');

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should use default pagination values', async () => {
      const query: NotificationQueryDto = {};

      await service.findAll(query, 'user-1');

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0); // (1-1) * 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should calculate unread count correctly', async () => {
      notificationRepository.count.mockResolvedValue(5);

      const result = await service.findAll({}, 'user-1');

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false, organization_id: 'org-1' },
      });
      expect(result.meta.unreadCount).toBe(5);
    });

    it('should handle case when organizationId is null', async () => {
      tenantContext.getOrganizationId.mockReturnValue(null);

      await service.findAll({}, 'user-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('notification.userId = :userId', { userId: 'user-1' });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'notification.organization_id = :organizationId',
        expect.any(Object)
      );
    });
  });

  describe('findOne', () => {
    it('should return notification when found', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.findOne('notification-1', 'user-1');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-1', userId: 'user-1' },
      });
      expect(result).toEqual({
        id: mockNotification.id,
        title: mockNotification.title,
        message: mockNotification.message,
        type: mockNotification.type,
        priority: mockNotification.priority,
        isRead: mockNotification.isRead,
        actionUrl: mockNotification.actionUrl,
        actionLabel: mockNotification.actionLabel,
        metadata: mockNotification.metadata,
        userId: mockNotification.userId,
        createdAt: mockNotification.createdAt.toISOString(),
        updatedAt: mockNotification.updatedAt.toISOString(),
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
      expect(translationService.translate).toHaveBeenCalledWith('notification.not_found', 'user-1');
    });
  });

  describe('update', () => {
    it('should update notification successfully', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      notificationRepository.save.mockResolvedValue({ ...mockNotification, ...mockUpdateNotificationDto });

      const result = await service.update('notification-1', mockUpdateNotificationDto, 'user-1');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-1', userId: 'user-1' },
      });
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', mockUpdateNotificationDto, 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should remove notification successfully', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      notificationRepository.remove.mockResolvedValue(mockNotification);

      await service.remove('notification-1', 'user-1');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-1', userId: 'user-1' },
      });
      expect(notificationRepository.remove).toHaveBeenCalledWith(mockNotification);
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 5 } as any);

      await service.markAllAsRead('user-1');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false, organization_id: 'org-1' },
        { isRead: true }
      );
    });

    it('should handle case when organizationId is null', async () => {
      tenantContext.getOrganizationId.mockReturnValue(null);

      await service.markAllAsRead('user-1');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false },
        { isRead: true }
      );
    });
  });

  describe('deleteAllRead', () => {
    it('should delete all read notifications', async () => {
      notificationRepository.delete.mockResolvedValue({ affected: 3 } as any);

      await service.deleteAllRead('user-1');

      expect(notificationRepository.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        isRead: true,
        organization_id: 'org-1',
      });
    });

    it('should handle case when organizationId is null', async () => {
      tenantContext.getOrganizationId.mockReturnValue(null);

      await service.deleteAllRead('user-1');

      expect(notificationRepository.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        isRead: true,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      notificationRepository.count.mockResolvedValue(7);

      const result = await service.getUnreadCount('user-1');

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false, organization_id: 'org-1' },
      });
      expect(result).toBe(7);
    });

    it('should handle case when organizationId is null', async () => {
      tenantContext.getOrganizationId.mockReturnValue(null);

      await service.getUnreadCount('user-1');

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('utility methods', () => {
    it('should create system notification', async () => {
      const systemNotification = {
        ...mockNotification,
        title: 'System Title',
        message: 'System Message',
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.MEDIUM,
        userId: 'user-1',
      };
      notificationRepository.create.mockReturnValue(systemNotification);
      notificationRepository.save.mockResolvedValue(systemNotification);

      const result = await service.createSystemNotification('System Title', 'System Message', 'user-1');

      expect(notificationRepository.create).toHaveBeenCalledWith({
        title: 'System Title',
        message: 'System Message',
        type: 'system',
        priority: 'medium',
        userId: 'user-1',
        organization_id: 'org-1',
      });
      expect(result.title).toBe('System Title');
    });

    it('should create order notification', async () => {
      const orderNotification = {
        ...mockNotification,
        title: 'Order Title',
        message: 'Order Message',
        type: NotificationType.ORDER,
        priority: NotificationPriority.MEDIUM,
        userId: 'user-1',
        actionUrl: '/dashboard/ordenes-de-compra/order-1',
        actionLabel: 'Ver Orden',
      };
      notificationRepository.create.mockReturnValue(orderNotification);
      notificationRepository.save.mockResolvedValue(orderNotification);

      const result = await service.createOrderNotification('Order Title', 'Order Message', 'order-1', 'user-1');

      expect(notificationRepository.create).toHaveBeenCalledWith({
        title: 'Order Title',
        message: 'Order Message',
        type: 'order',
        priority: 'medium',
        userId: 'user-1',
        actionUrl: '/dashboard/ordenes-de-compra/order-1',
        actionLabel: 'Ver Orden',
        metadata: { orderId: 'order-1' },
        organization_id: 'org-1',
      });
      expect(result.actionUrl).toBe('/dashboard/ordenes-de-compra/order-1');
    });

    it('should create inventory notification', async () => {
      const inventoryNotification = {
        ...mockNotification,
        title: 'Inventory Title',
        message: 'Inventory Message',
        type: NotificationType.INVENTORY,
        priority: NotificationPriority.HIGH,
        userId: 'user-1',
        actionUrl: '/dashboard/inventarios',
        actionLabel: 'Ver Inventario',
      };
      notificationRepository.create.mockReturnValue(inventoryNotification);
      notificationRepository.save.mockResolvedValue(inventoryNotification);

      const result = await service.createInventoryNotification('Inventory Title', 'Inventory Message', 'product-1', 'user-1');

      expect(notificationRepository.create).toHaveBeenCalledWith({
        title: 'Inventory Title',
        message: 'Inventory Message',
        type: 'inventory',
        priority: 'high',
        userId: 'user-1',
        actionUrl: '/dashboard/inventarios',
        actionLabel: 'Ver Inventario',
        metadata: { productId: 'product-1' },
        organization_id: 'org-1',
      });
      expect(result.priority).toBe('high');
    });

    it('should create sale notification', async () => {
      const saleNotification = {
        ...mockNotification,
        title: 'Sale Title',
        message: 'Sale Message',
        type: NotificationType.SALE,
        priority: NotificationPriority.MEDIUM,
        userId: 'user-1',
        actionUrl: '/dashboard/ventas/sale-1',
        actionLabel: 'Ver Venta',
      };
      notificationRepository.create.mockReturnValue(saleNotification);
      notificationRepository.save.mockResolvedValue(saleNotification);

      const result = await service.createSaleNotification('Sale Title', 'Sale Message', 'sale-1', 'user-1');

      expect(notificationRepository.create).toHaveBeenCalledWith({
        title: 'Sale Title',
        message: 'Sale Message',
        type: 'sale',
        priority: 'medium',
        userId: 'user-1',
        actionUrl: '/dashboard/ventas/sale-1',
        actionLabel: 'Ver Venta',
        metadata: { saleId: 'sale-1' },
        organization_id: 'org-1',
      });
      expect(result.actionLabel).toBe('Ver Venta');
    });

    it('should create quotation notification', async () => {
      const quotationNotification = {
        ...mockNotification,
        title: 'Quotation Title',
        message: 'Quotation Message',
        type: NotificationType.QUOTATION,
        priority: NotificationPriority.MEDIUM,
        userId: 'user-1',
        actionUrl: '/dashboard/cotizaciones/quote-1',
        actionLabel: 'Ver Cotización',
      };
      notificationRepository.create.mockReturnValue(quotationNotification);
      notificationRepository.save.mockResolvedValue(quotationNotification);

      const result = await service.createQuotationNotification('Quotation Title', 'Quotation Message', 'quote-1', 'user-1');

      expect(notificationRepository.create).toHaveBeenCalledWith({
        title: 'Quotation Title',
        message: 'Quotation Message',
        type: 'quotation',
        priority: 'medium',
        userId: 'user-1',
        actionUrl: '/dashboard/cotizaciones/quote-1',
        actionLabel: 'Ver Cotización',
        metadata: { quotationId: 'quote-1' },
        organization_id: 'org-1',
      });
      expect(result.type).toBe('quotation');
    });

    it('should create invoice notification', async () => {
      const invoiceNotification = {
        ...mockNotification,
        title: 'Invoice Title',
        message: 'Invoice Message',
        type: NotificationType.INVOICE,
        priority: NotificationPriority.HIGH,
        userId: 'user-1',
        actionUrl: '/dashboard/facturas/invoice-1',
        actionLabel: 'Ver Factura',
      };
      notificationRepository.create.mockReturnValue(invoiceNotification);
      notificationRepository.save.mockResolvedValue(invoiceNotification);

      const result = await service.createInvoiceNotification('Invoice Title', 'Invoice Message', 'invoice-1', 'user-1');

      expect(notificationRepository.create).toHaveBeenCalledWith({
        title: 'Invoice Title',
        message: 'Invoice Message',
        type: 'invoice',
        priority: 'high',
        userId: 'user-1',
        actionUrl: '/dashboard/facturas/invoice-1',
        actionLabel: 'Ver Factura',
        metadata: { invoiceId: 'invoice-1' },
        organization_id: 'org-1',
      });
      expect(result.priority).toBe('high');
    });
  });

  describe('mapToResponseDto', () => {
    it('should map notification to response DTO correctly', async () => {
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.create(mockCreateNotificationDto);

      expect(result).toEqual({
        id: mockNotification.id,
        title: mockNotification.title,
        message: mockNotification.message,
        type: mockNotification.type,
        priority: mockNotification.priority,
        isRead: mockNotification.isRead,
        actionUrl: mockNotification.actionUrl,
        actionLabel: mockNotification.actionLabel,
        metadata: mockNotification.metadata,
        userId: mockNotification.userId,
        createdAt: mockNotification.createdAt.toISOString(),
        updatedAt: mockNotification.updatedAt.toISOString(),
      });
    });

    it('should handle string dates in notification', async () => {
      const notificationWithStringDates = {
        ...mockNotification,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      notificationRepository.create.mockReturnValue(notificationWithStringDates);
      notificationRepository.save.mockResolvedValue(notificationWithStringDates);

      const result = await service.create(mockCreateNotificationDto);

      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      notificationRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateNotificationDto)).rejects.toThrow('Database error');
    });

    it('should handle translation service errors', async () => {
      translationService.translate.mockRejectedValue(new Error('Translation error'));
      notificationRepository.findOne.mockResolvedValue(null);

      // El servicio debería lanzar NotFoundException aunque haya error en traducción
      await expect(service.findOne('notification-1', 'user-1')).rejects.toThrow(Error);
    });
  });
});
