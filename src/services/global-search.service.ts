import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../models/product.entity';
import { Client } from '../models/client.entity';
import { Provider } from '../models/provider.entity';
import { Invoice } from '../models/invoice.entity';
import { PurchaseOrder } from '../models/purchase-order.entity';
import { Expense } from '../models/expense.entity';
import { AccountReceivable } from '../models/account-receivable.entity';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type:
    | 'product'
    | 'client'
    | 'provider'
    | 'invoice'
    | 'purchase_order'
    | 'expense'
    | 'account_receivable';
  url: string;
  metadata?: any;
}

@Injectable()
export class GlobalSearchService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(AccountReceivable)
    private accountReceivableRepository: Repository<AccountReceivable>,
  ) {}

  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    if (!query || query.trim().length < 2) {
      return results;
    }

    const searchTerm = `%${query.trim()}%`;

    const [
      products,
      clients,
      providers,
      invoices,
      purchaseOrders,
      expenses,
      accountsReceivable,
    ] = await Promise.all([
      this.searchProducts(searchTerm, 5),
      this.searchClients(searchTerm, 5),
      this.searchProviders(searchTerm, 5),
      this.searchInvoices(searchTerm, 5),
      this.searchPurchaseOrders(searchTerm, 5),
      this.searchExpenses(searchTerm, 5),
      this.searchAccountsReceivable(searchTerm, 5),
    ]);

    results.push(
      ...products,
      ...clients,
      ...providers,
      ...invoices,
      ...purchaseOrders,
      ...expenses,
      ...accountsReceivable,
    );

    return results.slice(0, limit);
  }

  private async searchProducts(
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const lowerSearch = searchTerm.toLowerCase();
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .where(
        'LOWER(product.name) LIKE :search OR LOWER(product.description) LIKE :search OR LOWER(product.barcode) LIKE :search',
        {
          search: `%${lowerSearch}%`,
        },
      )
      .andWhere('product.is_active = :isActive', { isActive: true })
      .limit(limit)
      .getMany();

    return products.map((product) => ({
      id: product.id,
      title: product.name,
      subtitle: `${product.category?.name || ''} - SKU: ${product.sku}`,
      type: 'product' as const,
      url: `/dashboard/productos/lista-de-productos`,
      metadata: {
        sku: product.sku,
        barcode: product.barcode,
        code: product.code,
      },
    }));
  }

  private async searchClients(
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const lowerSearch = searchTerm.toLowerCase();
    const clients = await this.clientRepository
      .createQueryBuilder('client')
      .where(
        'LOWER(client.name) LIKE :search OR LOWER(client.email) LIKE :search OR LOWER(client.phone) LIKE :search',
        {
          search: `%${lowerSearch}%`,
        },
      )
      .andWhere('client.status = :status', { status: true })
      .limit(limit)
      .getMany();

    return clients.map((client) => ({
      id: client.id,
      title: client.name,
      subtitle: client.email || client.phone,
      type: 'client' as const,
      url: `/dashboard/clientes`,
      metadata: {
        email: client.email,
        phone: client.phone,
      },
    }));
  }

  private async searchProviders(
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const lowerSearch = searchTerm.toLowerCase();
    const providers = await this.providerRepository
      .createQueryBuilder('provider')
      .where(
        'LOWER(provider.name) LIKE :search OR LOWER(provider.email) LIKE :search OR LOWER(provider.phone) LIKE :search',
        {
          search: `%${lowerSearch}%`,
        },
      )
      .andWhere('provider.status = :status', { status: true })
      .limit(limit)
      .getMany();

    return providers.map((provider) => ({
      id: provider.id,
      title: provider.name,
      subtitle: provider.email || provider.phone,
      type: 'provider' as const,
      url: `/dashboard/proveedores`,
      metadata: {
        email: provider.email,
        phone: provider.phone,
      },
    }));
  }

  private async searchInvoices(
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .where('invoice.code LIKE :search OR client.name LIKE :search', {
        search: searchTerm,
      })
      .limit(limit)
      .getMany();

    return invoices.map((invoice) => ({
      id: invoice.id,
      title: `Invoice ${invoice.code}`,
      subtitle: `${invoice.client?.name || ''} - $${invoice.total_amount}`,
      type: 'invoice' as const,
      url: `/dashboard/facturas`,
      metadata: {
        total: invoice.total_amount,
        status: invoice.status,
        issueDate: invoice.date,
      },
    }));
  }

  private async searchPurchaseOrders(
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const purchaseOrders = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.provider', 'provider')
      .where('po.code LIKE :search OR provider.name LIKE :search', {
        search: searchTerm,
      })
      .limit(limit)
      .getMany();

    return purchaseOrders.map((po) => ({
      id: po.id,
      title: `PO ${po.code}`,
      subtitle: `${po.provider?.name || ''} - $${po.amount}`,
      type: 'purchase_order' as const,
      url: `/dashboard/ordenes-de-compra`,
      metadata: {
        total: po.amount,
        status: po.status,
        orderDate: po.date,
      },
    }));
  }

  private async searchExpenses(
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const expenses = await this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .leftJoinAndSelect('expense.provider', 'provider')
      .where(
        'expense.description LIKE :search OR expense.reference LIKE :search OR provider.name LIKE :search',
        {
          search: searchTerm,
        },
      )
      .limit(limit)
      .getMany();

    return expenses.map((expense) => ({
      id: expense.id.toString(),
      title: expense.description,
      subtitle: `${expense.category?.name || ''} - $${expense.amount}`,
      type: 'expense' as const,
      url: `/dashboard/gastos`,
      metadata: {
        amount: expense.amount,
        status: expense.status,
        expenseDate: expense.expenseDate,
      },
    }));
  }

  private async searchAccountsReceivable(
    searchTerm: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const lowerSearch = searchTerm.toLowerCase();
    const accounts = await this.accountReceivableRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.client', 'client')
      .where(
        'LOWER(account.referenceNumber) LIKE :search OR LOWER(client.name) LIKE :search',
        {
          search: `%${lowerSearch}%`,
        },
      )
      .limit(limit)
      .getMany();

    return accounts.map((account) => ({
      id: account.id.toString(),
      title: `AR ${account.referenceNumber}`,
      subtitle: `${account.client?.name || ''} - $${account.remainingAmount} pending`,
      type: 'account_receivable' as const,
      url: `/dashboard/cuentas-por-cobrar`,
      metadata: {
        totalAmount: account.totalAmount,
        remainingAmount: account.remainingAmount,
        status: account.status,
        dueDate: account.dueDate,
      },
    }));
  }

  async searchByBarcode(barcode: string): Promise<SearchResult[]> {
    const products = await this.productRepository.find({
      where: { barcode, is_active: true },
      relations: ['category', 'brand'],
      take: 5,
    });

    return products.map((product) => ({
      id: product.id,
      title: product.name,
      subtitle: `${product.category?.name || ''} - SKU: ${product.sku}`,
      type: 'product' as const,
      url: `/dashboard/productos/lista-de-productos`,
      metadata: {
        sku: product.sku,
        code: product.code,
        barcode: product.barcode,
      },
    }));
  }
}
