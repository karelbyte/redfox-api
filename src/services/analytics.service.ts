import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../models/withdrawal.entity';
import { Product } from '../models/product.entity';
import { Client } from '../models/client.entity';
import { Invoice } from '../models/invoice.entity';
import { Inventory } from '../models/inventory.entity';
import { Reception } from '../models/reception.entity';

export interface SalesAnalytics {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesGrowth: number;
  salesByMonth: Array<{
    month: string;
    sales: number;
    revenue: number;
  }>;
  salesByDay: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
  }>;
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalPurchases: number;
    totalSpent: number;
  }>;
}

export interface InventoryAnalytics {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  productsByCategory: Array<{
    categoryName: string;
    count: number;
    value: number;
  }>;
  lowStockItems: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    warehouseName: string;
  }>;
}

export interface FinancialAnalytics {
  totalInvoices: number;
  totalInvoiced: number;
  pendingInvoices: number;
  paidInvoices: number;
  invoicesByStatus: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    invoiced: number;
    collected: number;
  }>;
}

export interface OperationalAnalytics {
  pendingReceptions: number;
  completedReceptions: number;
  averageReceptionTime: number;
  receptionsByMonth: Array<{
    month: string;
    count: number;
    totalAmount: number;
  }>;
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
  ) {}

  async getSalesAnalytics(
    startDate?: string,
    endDate?: string,
  ): Promise<SalesAnalytics> {
    const whereClause = this.buildDateWhereClause(startDate, endDate);

    // Total sales and revenue
    const salesData = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select([
        'COUNT(withdrawal.id) as totalSales',
        'SUM(CAST(withdrawal.amount AS DECIMAL(10,2))) as totalRevenue',
        'AVG(CAST(withdrawal.amount AS DECIMAL(10,2))) as averageTicket',
      ])
      .where(whereClause.where, whereClause.params)
      .getRawOne();

    // Sales growth (compare with previous period)
    const previousPeriodData = await this.getPreviousPeriodSales(
      startDate,
      endDate,
    );
    const salesGrowth = this.calculateGrowth(
      parseFloat(salesData.totalRevenue || '0'),
      previousPeriodData,
    );

    // Sales by month (last 12 months)
    const salesByMonth = await this.getSalesByMonth();

    // Sales by day (last 30 days)
    const salesByDay = await this.getSalesByDay();

    // Top products
    const topProducts = await this.getTopProducts(startDate, endDate);

    // Top clients
    const topClients = await this.getTopClients(startDate, endDate);

    return {
      totalSales: parseInt(salesData.totalSales || '0'),
      totalRevenue: parseFloat(salesData.totalRevenue || '0'),
      averageTicket: parseFloat(salesData.averageTicket || '0'),
      salesGrowth,
      salesByMonth,
      salesByDay,
      topProducts,
      topClients,
    };
  }

  async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    // Total products
    const totalProducts = await this.productRepository.count({
      where: { is_active: true },
    });

    // Inventory with low stock (less than 10 units)
    const inventoryData = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.warehouse', 'warehouse')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.is_active = :isActive', { isActive: true })
      .getMany();

    const lowStockProducts = inventoryData.filter(
      (item) => item.quantity < 10,
    ).length;
    const outOfStockProducts = inventoryData.filter(
      (item) => item.quantity === 0,
    ).length;

    // Total inventory value (quantity * price)
    const totalInventoryValue = inventoryData.reduce(
      (sum, item) => sum + item.quantity * (item.price || 0),
      0,
    );

    // Products by category
    const categoryMap = new Map<string, { count: number; value: number }>();
    inventoryData.forEach((item) => {
      const categoryName = item.product?.category?.name || 'Sin categoría';
      const existing = categoryMap.get(categoryName) || { count: 0, value: 0 };
      categoryMap.set(categoryName, {
        count: existing.count + 1,
        value: existing.value + item.quantity * (item.price || 0),
      });
    });

    const productsByCategory = Array.from(categoryMap.entries()).map(
      ([categoryName, data]) => ({
        categoryName,
        count: data.count,
        value: data.value,
      }),
    );

    // Low stock items details
    const lowStockItems = inventoryData
      .filter((item) => item.quantity < 10)
      .slice(0, 10) // Top 10 low stock items
      .map((item) => ({
        productId: item.product?.id || '',
        productName: item.product?.name || '',
        currentStock: item.quantity,
        warehouseName: item.warehouse?.name || '',
      }));

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue,
      productsByCategory,
      lowStockItems,
    };
  }

  async getFinancialAnalytics(
    startDate?: string,
    endDate?: string,
  ): Promise<FinancialAnalytics> {
    const whereClause = this.buildDateWhereClause(startDate, endDate);

    // Total invoices
    let totalInvoices: number;
    if (whereClause.where) {
      totalInvoices = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .where(whereClause.where, whereClause.params)
        .getCount();
    } else {
      totalInvoices = await this.invoiceRepository.count();
    }

    // Invoices by status
    const invoicesByStatus = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select([
        'invoice.status as status',
        'COUNT(invoice.id) as count',
        'SUM(invoice.total_amount) as amount',
      ])
      .where(whereClause.where, whereClause.params)
      .groupBy('invoice.status')
      .getRawMany();

    const totalInvoiced = invoicesByStatus.reduce(
      (sum, item) => sum + parseFloat(item.amount || '0'),
      0,
    );

    const pendingInvoices =
      invoicesByStatus.find((item) => item.status === 'DRAFT')?.count || 0;
    const paidInvoices =
      invoicesByStatus.find((item) => item.status === 'PAID')?.count || 0;

    // Monthly revenue (last 12 months)
    const monthlyRevenue = await this.getMonthlyRevenue();

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
    // Receptions data
    const pendingReceptions = await this.receptionRepository.count({
      where: { status: false },
    });

    const completedReceptions = await this.receptionRepository.count({
      where: { status: true },
    });

    // Average reception time (mock data for now)
    const averageReceptionTime = 2.5; // days

    // Receptions by month
    const receptionsByMonth = await this.getReceptionsByMonth();

    return {
      pendingReceptions,
      completedReceptions,
      averageReceptionTime,
      receptionsByMonth,
    };
  }

  private buildDateWhereClause(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) {
      return { where: '', params: {} };
    }

    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (startDate) {
      conditions.push('created_at >= :startDate');
      params.startDate = startDate;
    }

    if (endDate) {
      conditions.push('created_at <= :endDate');
      params.endDate = endDate;
    }

    return {
      where: conditions.join(' AND '),
      params,
    };
  }

  private async getPreviousPeriodSales(
    startDate?: string,
    endDate?: string,
  ): Promise<number> {
    // Calculate previous period dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    const periodLength = end.getTime() - start.getTime();

    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(end.getTime() - periodLength);

    const result = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select('SUM(CAST(withdrawal.amount AS DECIMAL(10,2))) as totalRevenue')
      .where(
        'withdrawal.created_at >= :prevStart AND withdrawal.created_at <= :prevEnd',
        {
          prevStart: prevStart.toISOString(),
          prevEnd: prevEnd.toISOString(),
        },
      )
      .getRawOne();

    return parseFloat(result.totalRevenue || '0');
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async getSalesByMonth() {
    const result = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select([
        "TO_CHAR(withdrawal.created_at, 'YYYY-MM') as month",
        'COUNT(withdrawal.id) as sales',
        'SUM(CAST(withdrawal.amount AS DECIMAL(10,2))) as revenue',
      ])
      .where("withdrawal.created_at >= NOW() - INTERVAL '12 months'")
      .groupBy("TO_CHAR(withdrawal.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      month: item.month,
      sales: parseInt(item.sales),
      revenue: parseFloat(item.revenue || '0'),
    }));
  }

  private async getSalesByDay() {
    const result = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select([
        "TO_CHAR(withdrawal.created_at, 'YYYY-MM-DD') as date",
        'COUNT(withdrawal.id) as sales',
        'SUM(CAST(withdrawal.amount AS DECIMAL(10,2))) as revenue',
      ])
      .where("withdrawal.created_at >= NOW() - INTERVAL '30 days'")
      .groupBy("TO_CHAR(withdrawal.created_at, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      date: item.date,
      sales: parseInt(item.sales),
      revenue: parseFloat(item.revenue || '0'),
    }));
  }

  private async getTopProducts(startDate?: string, endDate?: string) {
    const whereClause = this.buildDateWhereClause(startDate, endDate);

    // This would need to be implemented based on your sales details structure
    // For now, returning mock data
    return [
      {
        productId: '1',
        productName: 'Producto A',
        totalSold: 150,
        revenue: 15000,
      },
      {
        productId: '2',
        productName: 'Producto B',
        totalSold: 120,
        revenue: 12000,
      },
    ];
  }

  private async getTopClients(startDate?: string, endDate?: string) {
    const whereClause = this.buildDateWhereClause(startDate, endDate);

    const result = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .leftJoinAndSelect('withdrawal.client', 'client')
      .select([
        'client.id as clientId',
        'client.name as clientName',
        'COUNT(withdrawal.id) as totalPurchases',
        'SUM(CAST(withdrawal.amount AS DECIMAL(10,2))) as totalSpent',
      ])
      .where(whereClause.where, whereClause.params)
      .groupBy('client.id, client.name')
      .orderBy('totalSpent', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((item) => ({
      clientId: item.clientId,
      clientName: item.clientName,
      totalPurchases: parseInt(item.totalPurchases),
      totalSpent: parseFloat(item.totalSpent || '0'),
    }));
  }

  private async getMonthlyRevenue() {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select([
        "TO_CHAR(invoice.created_at, 'YYYY-MM') as month",
        "SUM(CASE WHEN invoice.status != 'CANCELLED' THEN invoice.total_amount ELSE 0 END) as invoiced",
        "SUM(CASE WHEN invoice.status = 'PAID' THEN invoice.total_amount ELSE 0 END) as collected",
      ])
      .where("invoice.created_at >= NOW() - INTERVAL '12 months'")
      .groupBy("TO_CHAR(invoice.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      month: item.month,
      invoiced: parseFloat(item.invoiced || '0'),
      collected: parseFloat(item.collected || '0'),
    }));
  }

  private async getReceptionsByMonth() {
    const result = await this.receptionRepository
      .createQueryBuilder('reception')
      .select([
        "TO_CHAR(reception.created_at, 'YYYY-MM') as month",
        'COUNT(reception.id) as count',
        'SUM(reception.amount) as totalAmount',
      ])
      .where("reception.created_at >= NOW() - INTERVAL '12 months'")
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
