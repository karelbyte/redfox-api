import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inventory } from '../models/inventory.entity';
import { Product } from '../models/product.entity';
import { User } from '../models/user.entity';
import { NotificationService } from './notification.service';
import { TenantContext } from './tenant-context.service';

export interface ExpiringProduct {
  id: string;
  productName: string;
  productSku: string;
  warehouseName: string;
  quantity: number;
  batchNumber?: string;
  expirationDate: Date;
  daysUntilExpiry: number;
  priority: 'urgent' | 'high' | 'medium';
}

export interface LowStockProduct {
  id: string;
  productName: string;
  productSku: string;
  currentStock: number;
  minStock: number;
  stockPercentage: number;
  priority: 'urgent' | 'high' | 'medium';
}

export interface InventoryAlertsResponse {
  expiringProducts: ExpiringProduct[];
  lowStockProducts: LowStockProduct[];
  totalAlerts: number;
  urgentAlerts: number;
}

@Injectable()
export class InventoryAlertsService {
  private readonly logger = new Logger(InventoryAlertsService.name);

  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Obtiene productos próximos a vencer
   */
  async getExpiringProducts(
    organizationId: string,
    urgentDays: number = 3,
    warningDays: number = 15,
  ): Promise<ExpiringProduct[]> {
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + urgentDays);

    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    const expiringInventory = await this.inventoryRepository.find({
      where: {
        organization_id: organizationId,
        expiration_date: LessThanOrEqual(warningDate),
        quantity: MoreThan(0),
      },
      relations: ['product', 'warehouse'],
      order: { expiration_date: 'ASC' },
    });

    return expiringInventory.map((item) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(item.expiration_date).getTime() - new Date().getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      let priority: 'urgent' | 'high' | 'medium' = 'medium';
      if (daysUntilExpiry <= 0) {
        priority = 'urgent'; // Ya vencido
      } else if (daysUntilExpiry <= urgentDays) {
        priority = 'urgent';
      } else if (daysUntilExpiry <= 7) {
        priority = 'high';
      }

      return {
        id: item.id,
        productName: item.product.name,
        productSku: item.product.sku,
        warehouseName: item.warehouse.name,
        quantity: Number(item.quantity),
        batchNumber: item.batch_number,
        expirationDate: new Date(item.expiration_date),
        daysUntilExpiry,
        priority,
      };
    });
  }

  /**
   * Obtiene productos con stock bajo
   */
  async getLowStockProducts(organizationId: string): Promise<LowStockProduct[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.type = :type', { type: 'tangible' })
      .andWhere('product.min_stock > 0')
      .andWhere('product.total_stock <= product.min_stock * 1.2') // 20% por encima del mínimo
      .getMany();

    return products.map((product) => {
      const currentStock = Number(product.total_stock);
      const minStock = Number(product.min_stock);
      const stockPercentage = (currentStock / minStock) * 100;

      let priority: 'urgent' | 'high' | 'medium' = 'medium';
      if (currentStock <= 0) {
        priority = 'urgent'; // Sin stock
      } else if (stockPercentage <= 50) {
        priority = 'urgent';
      } else if (stockPercentage <= 80) {
        priority = 'high';
      }

      return {
        id: product.id,
        productName: product.name,
        productSku: product.sku,
        currentStock,
        minStock,
        stockPercentage: Math.round(stockPercentage),
        priority,
      };
    });
  }

  /**
   * Obtiene todas las alertas de inventario para una organización
   */
  async getInventoryAlerts(organizationId: string): Promise<InventoryAlertsResponse> {
    const [expiringProducts, lowStockProducts] = await Promise.all([
      this.getExpiringProducts(organizationId),
      this.getLowStockProducts(organizationId),
    ]);

    const totalAlerts = expiringProducts.length + lowStockProducts.length;
    const urgentAlerts = [
      ...expiringProducts.filter(p => p.priority === 'urgent'),
      ...lowStockProducts.filter(p => p.priority === 'urgent'),
    ].length;

    return {
      expiringProducts,
      lowStockProducts,
      totalAlerts,
      urgentAlerts,
    };
  }

  /**
   * Cron job que se ejecuta diariamente para generar notificaciones automáticas
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateDailyInventoryAlerts(): Promise<void> {
    this.logger.log('Iniciando generación de alertas diarias de inventario...');

    try {
      // Obtener todas las organizaciones activas
      const organizations = await this.userRepository
        .createQueryBuilder('user')
        .select('DISTINCT user.organization_id', 'organization_id')
        .where('user.organization_id IS NOT NULL')
        .getRawMany();

      for (const org of organizations) {
        await this.generateAlertsForOrganization(org.organization_id);
      }

      this.logger.log('Alertas diarias de inventario generadas exitosamente');
    } catch (error) {
      this.logger.error('Error generando alertas diarias de inventario:', error);
    }
  }

  /**
   * Genera alertas para una organización específica
   */
  private async generateAlertsForOrganization(organizationId: string): Promise<void> {
    try {
      const alerts = await this.getInventoryAlerts(organizationId);

      // Obtener todos los usuarios activos de la organización
      const adminUsers = await this.userRepository.find({
        where: {
          organization_id: organizationId,
          status: true,
        },
      });

      if (adminUsers.length === 0) {
        this.logger.warn(`No se encontraron administradores para la organización ${organizationId}`);
        return;
      }

      // Generar notificaciones para productos próximos a vencer
      for (const product of alerts.expiringProducts) {
        if (product.priority === 'urgent' || product.priority === 'high') {
          await this.createExpirationNotification(product, adminUsers);
        }
      }

      // Generar notificaciones para productos con stock bajo
      for (const product of alerts.lowStockProducts) {
        if (product.priority === 'urgent' || product.priority === 'high') {
          await this.createLowStockNotification(product, adminUsers);
        }
      }

      this.logger.log(`Alertas generadas para organización ${organizationId}: ${alerts.totalAlerts} total, ${alerts.urgentAlerts} urgentes`);
    } catch (error) {
      this.logger.error(`Error generando alertas para organización ${organizationId}:`, error);
    }
  }

  /**
   * Crea notificación de producto próximo a vencer
   */
  private async createExpirationNotification(
    product: ExpiringProduct,
    users: User[],
  ): Promise<void> {
    const isExpired = product.daysUntilExpiry <= 0;
    const title = isExpired 
      ? '🚨 Producto Vencido' 
      : '⚠️ Producto Próximo a Vencer';

    const message = isExpired
      ? `${product.productName} (${product.productSku}) ha vencido en ${product.warehouseName}. Cantidad: ${product.quantity}${product.batchNumber ? `, Lote: ${product.batchNumber}` : ''}`
      : `${product.productName} (${product.productSku}) vence en ${product.daysUntilExpiry} día(s) en ${product.warehouseName}. Cantidad: ${product.quantity}${product.batchNumber ? `, Lote: ${product.batchNumber}` : ''}`;

    for (const user of users) {
      await this.notificationService.createInventoryNotification(
        title,
        message,
        product.id,
        user.id,
      );
    }
  }

  /**
   * Crea notificación de stock bajo
   */
  private async createLowStockNotification(
    product: LowStockProduct,
    users: User[],
  ): Promise<void> {
    const isOutOfStock = product.currentStock <= 0;
    const title = isOutOfStock 
      ? '🚨 Sin Stock' 
      : '📉 Stock Bajo';

    const message = isOutOfStock
      ? `${product.productName} (${product.productSku}) está agotado. Stock actual: ${product.currentStock}`
      : `${product.productName} (${product.productSku}) tiene stock bajo. Stock actual: ${product.currentStock}, Mínimo: ${product.minStock} (${product.stockPercentage}%)`;

    for (const user of users) {
      await this.notificationService.createInventoryNotification(
        title,
        message,
        product.id,
        user.id,
      );
    }
  }

  /**
   * Genera alertas inmediatas cuando se detecta una condición crítica
   */
  async checkAndGenerateImmediateAlerts(
    organizationId: string,
    productId?: string,
  ): Promise<void> {
    try {
      // Obtener todos los usuarios activos de la organización
      const adminUsers = await this.userRepository.find({
        where: {
          organization_id: organizationId,
          status: true,
        },
      });

      if (adminUsers.length === 0) return;

      // Si se especifica un producto, solo verificar ese producto
      if (productId) {
        await this.checkProductAlerts(productId, organizationId, adminUsers);
      } else {
        // Verificar todos los productos críticos
        const alerts = await this.getInventoryAlerts(organizationId);
        
        for (const product of alerts.expiringProducts) {
          if (product.priority === 'urgent') {
            await this.createExpirationNotification(product, adminUsers);
          }
        }

        for (const product of alerts.lowStockProducts) {
          if (product.priority === 'urgent') {
            await this.createLowStockNotification(product, adminUsers);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error generando alertas inmediatas:', error);
    }
  }

  /**
   * Verifica alertas para un producto específico
   */
  private async checkProductAlerts(
    productId: string,
    organizationId: string,
    adminUsers: User[],
  ): Promise<void> {
    // Verificar stock bajo
    const product = await this.productRepository.findOne({
      where: { id: productId, organization_id: organizationId },
    });

    if (product && product.type === 'tangible' && product.min_stock > 0) {
      const currentStock = Number(product.total_stock);
      const minStock = Number(product.min_stock);

      if (currentStock <= minStock * 0.5) { // 50% del mínimo o menos
        const lowStockProduct: LowStockProduct = {
          id: product.id,
          productName: product.name,
          productSku: product.sku,
          currentStock,
          minStock,
          stockPercentage: (currentStock / minStock) * 100,
          priority: currentStock <= 0 ? 'urgent' : 'high',
        };

        await this.createLowStockNotification(lowStockProduct, adminUsers);
      }
    }

    // Verificar productos próximos a vencer
    const expiringInventory = await this.inventoryRepository.find({
      where: {
        product_id: productId,
        organization_id: organizationId,
        quantity: MoreThan(0),
      },
      relations: ['product', 'warehouse'],
    });

    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 3);

    for (const item of expiringInventory) {
      if (item.expiration_date && new Date(item.expiration_date) <= urgentDate) {
        const daysUntilExpiry = Math.ceil(
          (new Date(item.expiration_date).getTime() - new Date().getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        const expiringProduct: ExpiringProduct = {
          id: item.id,
          productName: item.product.name,
          productSku: item.product.sku,
          warehouseName: item.warehouse.name,
          quantity: Number(item.quantity),
          batchNumber: item.batch_number,
          expirationDate: new Date(item.expiration_date),
          daysUntilExpiry,
          priority: daysUntilExpiry <= 0 ? 'urgent' : 'high',
        };

        await this.createExpirationNotification(expiringProduct, adminUsers);
      }
    }
  }
}