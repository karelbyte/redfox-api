import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../models/withdrawal.entity';
import { Product } from '../models/product.entity';
import { Client } from '../models/client.entity';
import { Invoice } from '../models/invoice.entity';
import { Inventory } from '../models/inventory.entity';
import { Reception } from '../models/reception.entity';
import { TenantContext } from './tenant-context.service';

export interface SalesAnalytics {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesGrowth: number;
  salesByMonth: Array<{ month: string; sales: number; revenue: number }>;
  salesByDay: Array<{ date: string; sales: number; revenue: number }>;
  topProducts: Array<{ productId: string; productName: string; totalSold: number; revenue: number }>;
  topClients: Array<{ clientId: string; clientName: string; totalPurchases: number; totalSpent: number }>;
}

export interface InventoryAnalytics {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  productsByCategory: Array<{ categoryName: string; count: number; value: number }>;
  lowStockItems: Array<{ productId: string; productName: string; currentStock: number; warehouseName: string }>;
}

export interface FinancialAnalytics {
  totalInvoices: number;
  totalInvoiced: number;
  pendingInvoices: number;
  paidInvoices: number;
  invoicesByStatus: Array<{ status: string; count: number; amount: number }>;
  monthlyRevenue: Array<{ month: string; invoiced: number; collected: number }>;
}

export interface OperationalAnalytics {
  pendingReceptions: number;
  completedReceptions: number;
  averageReceptionTime: number;
  receptionsByMonth: Array<{ month: string; count: number; totalAmount: number }>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Reception)
    private receptionRepository: Repository<Reception>,
    private readonly tenantContext: TenantContext,
  ) {}

  async getSalesAnalytics(startDate?: string, endDate?: string): Promise<SalesAnalytics> {
    const organizationId = this.tenantContext.getOrganizationId() ?? '';

    const conditions: string[] = ['withdrawal.organization_id = :organizationId'];
    const params: Record<string, any> = { organizationId };

    if (startDate) {
      conditions.push('withdrawal.created_at >= :startDate');
      params.startDate = startDate;
    }
    if (endDate) {
      conditions.push('withdrawal.created_at <= :endDate');
      params.endDate = endDate;
    }
    const where = conditions.join(' AND ');

    // Contar todas las ventas (cualquier estado)
    const salesData = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select([
        'COUNT(withdrawal.id) as "totalSales"',
        "SUM(CASE WHEN withdrawal.status = 'CLOSED' THEN CAST(withdrawal.amount AS DECIMAL(10,2)) ELSE 0 END) as \"totalRevenue\"",
        "AVG(CASE WHEN withdrawal.status = 'CLOSED' THEN CAST(withdrawal.amount AS DECIMAL(10,2)) ELSE NULL END) as \"averageTicket\"",
      ])
      .where(where, params)
      .getRawOne();

    const previousPeriodData = await this.getPreviousPeriodSales(organizationId, startDate, endDate);
    const salesGrowth = this.calculateGrowth(parseFloat(salesData?.totalRevenue || '0'), previousPeriodData);

    const salesByMonth = await this.getSalesByMonth(organizationId);
    const salesByDay = await this.getSalesByDay(organizationId);
    const topProducts = await this.getTopProducts(organizationId, startDate, endDate);
    const topClients = await this.getTopClients(organizationId, startDate, endDate);

    return {
      totalSales: parseInt(salesData?.totalSales || '0'),
      totalRevenue: parseFloat(salesData?.totalRevenue || '0'),
      averageTicket: parseFloat(salesData?.averageTicket || '0'),
      salesGrowth,
      salesByMonth,
      salesByDay,
      topProducts,
      topClients,
    };
  }

  async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    const organizationId = this.tenantContext.getOrganizationId() ?? '';

    // Total de productos activos (todos los tipos)
    const totalProducts = await this.productRepository.count({
      where: { organization_id: organizationId, is_active: true },
    });

    console.log(organizationId, totalProducts) 
    // Productos por categoría — todos los tipos (tangible, service, digital)
    const allProducts = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.organization_id = :organizationId AND product.is_active = true', { organizationId })
      .getMany();

    const categoryMap = new Map<string, { count: number; value: number }>();
    allProducts.forEach((product) => {
      const categoryName = product.category?.name || 'Sin categoría';
      const existing = categoryMap.get(categoryName) || { count: 0, value: 0 };
      categoryMap.set(categoryName, {
        count: existing.count + 1,
        value: existing.value + Number(product.base_price || 0),
      });
    });

    const productsByCategory = Array.from(categoryMap.entries()).map(([categoryName, data]) => ({
      categoryName,
      count: data.count,
      value: data.value,
    }));

    // Stock bajo y sin stock — solo aplica a productos tangibles con inventario
    const inventoryData = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.warehouse', 'warehouse')
      .where('inventory.organization_id = :organizationId', { organizationId })
      .andWhere('product.is_active = true')
      .andWhere("product.type = 'tangible'")
      .getMany();

    // Agrupar por producto (multi-almacén)
    const productStockMap = new Map<string, { quantity: number; price: number; productName: string; warehouseName: string }>();
    inventoryData.forEach((item) => {
      const productId = item.product?.id;
      if (!productId) return;
      const existing = productStockMap.get(productId);
      if (existing) {
        existing.quantity += Number(item.quantity);
      } else {
        productStockMap.set(productId, {
          quantity: Number(item.quantity),
          price: Number(item.price || 0),
          productName: item.product?.name || '',
          warehouseName: item.warehouse?.name || '',
        });
      }
    });

    const productStocks = Array.from(productStockMap.values());
    const lowStockProducts = productStocks.filter((p) => p.quantity > 0 && p.quantity < 10).length;
    const outOfStockProducts = productStocks.filter((p) => p.quantity === 0).length;
    const totalInventoryValue = productStocks.reduce((sum, p) => sum + p.quantity * p.price, 0);

    const lowStockItems = productStocks
      .filter((p) => p.quantity > 0 && p.quantity < 10)
      .slice(0, 10)
      .map((p) => ({
        productId: '',
        productName: p.productName,
        currentStock: p.quantity,
        warehouseName: p.warehouseName,
      }));

    return { totalProducts, lowStockProducts, outOfStockProducts, totalInventoryValue, productsByCategory, lowStockItems };
  }

  async getFinancialAnalytics(startDate?: string, endDate?: string): Promise<FinancialAnalytics> {
    const organizationId = this.tenantContext.getOrganizationId() ?? '';
    const { where, params } = this.buildWhereClause(organizationId, startDate, endDate, 'invoice');

    const totalInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where(where, params)
      .getCount();

    const invoicesByStatus = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select([
        'invoice.status as status',
        'COUNT(invoice.id) as count',
        'SUM(invoice.total_amount) as amount',
      ])
      .where(where, params)
      .groupBy('invoice.status')
      .getRawMany();

    // Excluir facturas canceladas del total facturado
    const totalInvoiced = invoicesByStatus
      .filter((item) => item.status !== 'CANCELLED')
      .reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);

    const pendingInvoices = invoicesByStatus.find((item) => item.status === 'DRAFT')?.count || 0;
    const paidInvoices = invoicesByStatus.find((item) => item.status === 'PAID')?.count || 0;

    const monthlyRevenue = await this.getMonthlyRevenue(organizationId);

    return {
      totalInvoices,
      totalInvoiced,
      pendingInvoices: parseInt(pendingInvoices.toString()),
      paidInvoices: parseInt(paidInvoices.toString()),
      invoicesByStatus: invoicesByStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.count),
        amount: parseFloat(item.amount || '0'),
      })),
      monthlyRevenue,
    };
  }

  async getOperationalAnalytics(): Promise<OperationalAnalytics> {
    const organizationId = this.tenantContext.getOrganizationId() ?? '';

    const pendingReceptions = await this.receptionRepository.count({
      where: { organization_id: organizationId, status: false },
    });

    const completedReceptions = await this.receptionRepository.count({
      where: { organization_id: organizationId, status: true },
    });

    // Calcular tiempo promedio real entre fecha de creación y última actualización en recepciones completadas
    const avgResult = await this.receptionRepository
      .createQueryBuilder('reception')
      .select("AVG(EXTRACT(EPOCH FROM (reception.updated_at - reception.created_at)) / 86400) as avgDays")
      .where('reception.organization_id = :organizationId AND reception.status = true', { organizationId })
      .getRawOne();

    const averageReceptionTime = parseFloat(avgResult?.avgDays || '0');

    const receptionsByMonth = await this.getReceptionsByMonth(organizationId);

    return { pendingReceptions, completedReceptions, averageReceptionTime, receptionsByMonth };
  }

  /**
   * Construye el WHERE base con organization_id + filtros de fecha opcionales.
   * alias: alias de la entidad en el QueryBuilder (e.g. 'withdrawal', 'invoice')
   */
  private buildWhereClause(
    organizationId: string,
    startDate?: string,
    endDate?: string,
    alias: string = 'entity',
  ): { where: string; params: Record<string, any> } {
    const conditions: string[] = [`${alias}.organization_id = :organizationId`];
    const params: Record<string, any> = { organizationId };

    if (startDate) {
      conditions.push(`${alias}.created_at >= :startDate`);
      params.startDate = startDate;
    }
    if (endDate) {
      conditions.push(`${alias}.created_at <= :endDate`);
      params.endDate = endDate;
    }

    return { where: conditions.join(' AND '), params };
  }

  private async getPreviousPeriodSales(
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<number> {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    const periodLength = end.getTime() - start.getTime();

    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(end.getTime() - periodLength);

    const result = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select('SUM(CAST(withdrawal.amount AS DECIMAL(10,2))) as totalRevenue')
      .where(
        "withdrawal.organization_id = :organizationId AND withdrawal.status = 'CLOSED' AND withdrawal.created_at >= :prevStart AND withdrawal.created_at <= :prevEnd",
        { organizationId, prevStart: prevStart.toISOString(), prevEnd: prevEnd.toISOString() },
      )
      .getRawOne();

    return parseFloat(result?.totalRevenue || '0');
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async getSalesByMonth(organizationId: string) {
    const result = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select([
        "TO_CHAR(withdrawal.created_at, 'YYYY-MM') as month",
        'COUNT(withdrawal.id) as sales',
        "SUM(CASE WHEN withdrawal.status = 'CLOSED' THEN CAST(withdrawal.amount AS DECIMAL(10,2)) ELSE 0 END) as revenue",
      ])
      .where(
        "withdrawal.organization_id = :organizationId AND withdrawal.created_at >= NOW() - INTERVAL '12 months'",
        { organizationId },
      )
      .groupBy("TO_CHAR(withdrawal.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      month: item.month,
      sales: parseInt(item.sales),
      revenue: parseFloat(item.revenue || '0'),
    }));
  }

  private async getSalesByDay(organizationId: string) {
    const result = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select([
        "TO_CHAR(withdrawal.created_at, 'YYYY-MM-DD') as date",
        'COUNT(withdrawal.id) as sales',
        "SUM(CASE WHEN withdrawal.status = 'CLOSED' THEN CAST(withdrawal.amount AS DECIMAL(10,2)) ELSE 0 END) as revenue",
      ])
      .where(
        "withdrawal.organization_id = :organizationId AND withdrawal.created_at >= NOW() - INTERVAL '30 days'",
        { organizationId },
      )
      .groupBy("TO_CHAR(withdrawal.created_at, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      date: item.date,
      sales: parseInt(item.sales),
      revenue: parseFloat(item.revenue || '0'),
    }));
  }

  private async getTopProducts(organizationId: string, startDate?: string, endDate?: string) {
    const qb = this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .innerJoin('withdrawal.details', 'detail')
      .innerJoin('detail.product', 'product')
      .select([
        'product.id as "productId"',
        'product.name as "productName"',
        'SUM(CAST(detail.quantity AS DECIMAL(10,2))) as "totalSold"',
        'SUM(CAST(detail.quantity AS DECIMAL(10,2)) * CAST(detail.price AS DECIMAL(10,2))) as "revenue"',
      ])
      .where('withdrawal.organization_id = :organizationId', { organizationId })
      .groupBy('product.id, product.name')
      .orderBy('"totalSold"', 'DESC')
      .limit(10);

    if (startDate) {
      qb.andWhere('withdrawal.created_at >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('withdrawal.created_at <= :endDate', { endDate });
    }

    const result = await qb.getRawMany();

    return result.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      totalSold: parseFloat(item.totalSold || '0'),
      revenue: parseFloat(item.revenue || '0'),
    }));
  }

  private async getTopClients(organizationId: string, startDate?: string, endDate?: string) {
    const { where, params } = this.buildWhereClause(organizationId, startDate, endDate, 'withdrawal');

    const result = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .leftJoin('withdrawal.client', 'client')
      .select([
        'client.id as "clientId"',
        'client.name as "clientName"',
        'COUNT(withdrawal.id) as "totalPurchases"',
        'SUM(CAST(withdrawal.amount AS DECIMAL(10,2))) as "totalSpent"',
      ])
      .where(where, params)
      .groupBy('client.id, client.name')
      .orderBy('"totalSpent"', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((item) => ({
      clientId: item.clientId,
      clientName: item.clientName,
      totalPurchases: parseInt(item.totalPurchases || '0'),
      totalSpent: parseFloat(item.totalSpent || '0'),
    }));
  }

  private async getMonthlyRevenue(organizationId: string) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select([
        "TO_CHAR(invoice.created_at, 'YYYY-MM') as month",
        "SUM(CASE WHEN invoice.status != 'CANCELLED' THEN invoice.total_amount ELSE 0 END) as invoiced",
        "SUM(CASE WHEN invoice.status = 'PAID' THEN invoice.total_amount ELSE 0 END) as collected",
      ])
      .where(
        "invoice.organization_id = :organizationId AND invoice.created_at >= NOW() - INTERVAL '12 months'",
        { organizationId },
      )
      .groupBy("TO_CHAR(invoice.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      month: item.month,
      invoiced: parseFloat(item.invoiced || '0'),
      collected: parseFloat(item.collected || '0'),
    }));
  }

  private async getReceptionsByMonth(organizationId: string) {
    const result = await this.receptionRepository
      .createQueryBuilder('reception')
      .select([
        "TO_CHAR(reception.created_at, 'YYYY-MM') as month",
        'COUNT(reception.id) as count',
        'SUM(reception.amount) as totalAmount',
      ])
      .where(
        "reception.organization_id = :organizationId AND reception.created_at >= NOW() - INTERVAL '12 months'",
        { organizationId },
      )
      .groupBy("TO_CHAR(reception.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      month: item.month,
      count: parseInt(item.count),
      totalAmount: parseFloat(item.totalAmount || '0'),
    }));
  }
}
