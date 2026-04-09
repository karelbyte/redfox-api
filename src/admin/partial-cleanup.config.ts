import { PartialOrganizationCleanupTarget } from '../dtos/admin/partial-organization-cleanup.dto';

export interface PartialCleanupRule {
  requires: PartialOrganizationCleanupTarget[];
  cascadeDeletes: string[];
}

export const PARTIAL_CLEANUP_RULES: Record<
  PartialOrganizationCleanupTarget,
  PartialCleanupRule
> = {
  [PartialOrganizationCleanupTarget.PRODUCTS]: {
    requires: [
      PartialOrganizationCleanupTarget.SALES,
      PartialOrganizationCleanupTarget.INVOICES,
    ],
    cascadeDeletes: [
      'cotizaciones',
      'inventario',
      'ajustes de almacén',
      'recepciones',
      'órdenes de compra',
      'devoluciones',
      'historial de producto',
      'precios e impuestos de producto',
    ],
  },
  [PartialOrganizationCleanupTarget.CLIENTS]: {
    requires: [
      PartialOrganizationCleanupTarget.SALES,
      PartialOrganizationCleanupTarget.INVOICES,
    ],
    cascadeDeletes: ['cotizaciones', 'créditos de cliente', 'datos fiscales'],
  },
  [PartialOrganizationCleanupTarget.PROVIDERS]: {
    requires: [],
    cascadeDeletes: [
      'órdenes de compra',
      'recepciones',
      'devoluciones',
      'gastos',
      'cuentas por pagar',
      'créditos de proveedor',
      'datos fiscales',
    ],
  },
  [PartialOrganizationCleanupTarget.QUOTATIONS]: {
    requires: [],
    cascadeDeletes: ['detalle de cotizaciones', 'consecutivo de cotizaciones'],
  },
  [PartialOrganizationCleanupTarget.RECEPTIONS]: {
    requires: [PartialOrganizationCleanupTarget.INVENTORY_STOCK],
    cascadeDeletes: [
      'detalle de recepciones',
      'consecutivo de recepciones',
    ],
  },
  [PartialOrganizationCleanupTarget.INVENTORY_STOCK]: {
    requires: [],
    cascadeDeletes: [
      'inventario por almacén',
      'aperturas de almacén',
      'ajustes de almacén',
      'detalle de ajustes',
      'historial de producto',
      'stock total por producto',
    ],
  },
  [PartialOrganizationCleanupTarget.SALES]: {
    requires: [],
    cascadeDeletes: ['detalle de ventas', 'movimientos de caja ligados a ventas'],
  },
  [PartialOrganizationCleanupTarget.INVOICES]: {
    requires: [],
    cascadeDeletes: [
      'detalle de facturas',
      'pagos de factura',
      'cuentas por cobrar ligadas a factura',
    ],
  },
};

export const PARTIAL_CLEANUP_TARGET_ORDER: PartialOrganizationCleanupTarget[] = [
  PartialOrganizationCleanupTarget.PRODUCTS,
  PartialOrganizationCleanupTarget.CLIENTS,
  PartialOrganizationCleanupTarget.PROVIDERS,
  PartialOrganizationCleanupTarget.QUOTATIONS,
  PartialOrganizationCleanupTarget.RECEPTIONS,
  PartialOrganizationCleanupTarget.INVENTORY_STOCK,
  PartialOrganizationCleanupTarget.SALES,
  PartialOrganizationCleanupTarget.INVOICES,
];
