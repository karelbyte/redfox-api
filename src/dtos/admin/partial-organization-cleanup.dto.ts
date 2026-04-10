import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum } from 'class-validator';

export enum PartialOrganizationCleanupTarget {
  PRODUCTS = 'products',
  CLIENTS = 'clients',
  PROVIDERS = 'providers',
  QUOTATIONS = 'quotations',
  RECEPTIONS = 'receptions',
  INVENTORY_STOCK = 'inventory_stock',
  SALES = 'sales',
  INVOICES = 'invoices',
}

export class PartialOrganizationCleanupDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(PartialOrganizationCleanupTarget, { each: true })
  targets: PartialOrganizationCleanupTarget[];
}
