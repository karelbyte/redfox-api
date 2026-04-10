/**
 * Demo Data Seeder — uso manual exclusivo
 *
 * Crea datos de prueba realistas para una organización específica.
 * Orden: moneda → marcas → categorías → unidades → clientes (+crédito) →
 *        proveedores → productos → almacenes → inventario →
 *        cotizaciones → órdenes de compra → ventas
 *
 * Uso:
 *   npm run seed:demo -- <slug>
 *
 * Sin slug muestra las organizaciones disponibles.
 */

import dataSource from '../../config/typeorm-cli.config';
import { Organization } from '../../models/organization.entity';
import { Client } from '../../models/client.entity';
import { ClientCredit } from '../../models/client-credit.entity';
import { Provider } from '../../models/provider.entity';
import {
  Product,
  ProductType,
  InventoryStrategy,
} from '../../models/product.entity';
import { MeasurementUnit } from '../../models/measurement-unit.entity';
import { Brand } from '../../models/brand.entity';
import { Category } from '../../models/category.entity';
import { Warehouse } from '../../models/warehouse.entity';
import { Currency } from '../../models/currency.entity';
import { Inventory } from '../../models/inventory.entity';
import {
  Withdrawal,
  WithdrawalStatus,
  WithdrawalType,
  PaymentMethod,
} from '../../models/withdrawal.entity';
import { WithdrawalDetail } from '../../models/withdrawal-detail.entity';
import { Quotation, QuotationStatus } from '../../models/quotation.entity';
import { QuotationDetail } from '../../models/quotation-detail.entity';
import { PurchaseOrder } from '../../models/purchase-order.entity';
import { PurchaseOrderDetail } from '../../models/purchase-order-detail.entity';
import {
  Expense,
  ExpenseStatus,
  ExpenseRecurrence,
} from '../../models/expense.entity';
import { ExpenseCategory } from '../../models/expense-category.entity';
import {
  AccountReceivable,
  AccountReceivableStatus,
} from '../../models/account-receivable.entity';
import {
  CashRegister,
  CashRegisterStatus,
} from '../../models/cash-register.entity';
import {
  CashTransaction,
  CashTransactionType,
  PaymentMethod as CashPaymentMethod,
} from '../../models/cash-transaction.entity';
import { User } from '../../models/user.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rnd = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pad = (n: number, len = 3) => String(n).padStart(len, '0');
const round2 = (n: number) => Math.round(n * 100) / 100;

const FIRST_NAMES = [
  'Carlos',
  'María',
  'José',
  'Ana',
  'Luis',
  'Laura',
  'Miguel',
  'Sofía',
  'Jorge',
  'Elena',
  'Roberto',
  'Patricia',
  'Fernando',
  'Claudia',
  'Ricardo',
  'Alejandro',
  'Gabriela',
  'Héctor',
  'Valeria',
  'Arturo',
];
const LAST_NAMES = [
  'García',
  'Martínez',
  'López',
  'Hernández',
  'González',
  'Pérez',
  'Rodríguez',
  'Sánchez',
  'Ramírez',
  'Torres',
  'Flores',
  'Rivera',
  'Morales',
  'Cruz',
  'Reyes',
  'Ortega',
  'Jiménez',
  'Vargas',
  'Castillo',
  'Mendoza',
];
const COMPANIES = [
  'Distribuidora',
  'Comercial',
  'Servicios',
  'Industrias',
  'Grupo',
  'Soluciones',
  'Tecnología',
  'Alimentos',
  'Construcciones',
  'Logística',
  'Importadora',
  'Exportadora',
];
const SUFFIXES = [
  'S.A. de C.V.',
  'S.A.',
  'S. de R.L.',
  'S.C.',
  'S.A.P.I. de C.V.',
];

const fakeName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const fakeCompany = () =>
  `${pick(COMPANIES)} ${pick(LAST_NAMES)} ${pick(SUFFIXES)}`;
const fakeEmail = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '')
    .substring(0, 20)}@empresa.com`;
const fakePhone = () =>
  `+52 ${rnd(100, 999)} ${rnd(100, 999)} ${rnd(1000, 9999)}`;
const fakeZip = () => String(rnd(10000, 99999));
const fakeDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
};

// ─── Catálogo de productos ────────────────────────────────────────────────────

const PRODUCTS = [
  {
    name: 'Leche Entera 1L',
    sku: 'LECH-001',
    code: '50211503',
    unit: 'LTR',
    price: 22.5,
    brand: 'Lala',
    cat: 'Lácteos',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Queso Manchego 400g',
    sku: 'QUES-001',
    code: '50211503',
    unit: 'KGM',
    price: 85.0,
    brand: 'Lala',
    cat: 'Lácteos',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Yogurt Natural 1kg',
    sku: 'YOGU-001',
    code: '50211503',
    unit: 'KGM',
    price: 48.0,
    brand: 'Danone',
    cat: 'Lácteos',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Aceite Vegetal 1L',
    sku: 'ACEI-001',
    code: '47131700',
    unit: 'LTR',
    price: 38.0,
    brand: 'Nutrioli',
    cat: 'Abarrotes',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Arroz Morelos 1kg',
    sku: 'ARRO-001',
    code: '50221700',
    unit: 'KGM',
    price: 28.0,
    brand: 'Genérico',
    cat: 'Abarrotes',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Frijol Negro 1kg',
    sku: 'FRIJ-001',
    code: '50221700',
    unit: 'KGM',
    price: 32.0,
    brand: 'Genérico',
    cat: 'Abarrotes',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Azúcar Estándar 1kg',
    sku: 'AZUC-001',
    code: '50221700',
    unit: 'KGM',
    price: 24.0,
    brand: 'Genérico',
    cat: 'Abarrotes',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Jabón de Tocador',
    sku: 'JABO-001',
    code: '53131600',
    unit: 'H87',
    price: 18.0,
    brand: 'Dove',
    cat: 'Higiene',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Shampoo 400ml',
    sku: 'SHAM-001',
    code: '53131600',
    unit: 'H87',
    price: 65.0,
    brand: 'Pantene',
    cat: 'Higiene',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Papel Higiénico x4',
    sku: 'PAPE-001',
    code: '14111500',
    unit: 'H87',
    price: 42.0,
    brand: 'Kleenex',
    cat: 'Higiene',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Detergente 1kg',
    sku: 'DETE-001',
    code: '47131700',
    unit: 'KGM',
    price: 55.0,
    brand: 'Ariel',
    cat: 'Limpieza',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Cloro 1L',
    sku: 'CLOR-001',
    code: '47131700',
    unit: 'LTR',
    price: 15.0,
    brand: 'Cloralex',
    cat: 'Limpieza',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Agua Purificada 20L',
    sku: 'AGUA-001',
    code: '50202300',
    unit: 'LTR',
    price: 45.0,
    brand: 'Ciel',
    cat: 'Bebidas',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Refresco Cola 600ml',
    sku: 'REFR-001',
    code: '50202300',
    unit: 'H87',
    price: 18.0,
    brand: 'Coca-Cola',
    cat: 'Bebidas',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Jugo de Naranja 1L',
    sku: 'JUGO-001',
    code: '50202300',
    unit: 'LTR',
    price: 32.0,
    brand: 'Del Valle',
    cat: 'Bebidas',
    type: ProductType.TANGIBLE,
  },
  {
    name: 'Servicio de Instalación',
    sku: 'SERV-001',
    code: '81111500',
    unit: 'E48',
    price: 500.0,
    brand: 'Genérico',
    cat: 'Servicios',
    type: ProductType.SERVICE,
  },
  {
    name: 'Consultoría Técnica',
    sku: 'CONS-001',
    code: '80141600',
    unit: 'HUR',
    price: 800.0,
    brand: 'Genérico',
    cat: 'Servicios',
    type: ProductType.SERVICE,
  },
  {
    name: 'Mantenimiento Mensual',
    sku: 'MANT-001',
    code: '81111500',
    unit: 'E48',
    price: 1200.0,
    brand: 'Genérico',
    cat: 'Servicios',
    type: ProductType.SERVICE,
  },
];

const UNIT_DESC: Record<string, string> = {
  LTR: 'Litro',
  KGM: 'Kilogramo',
  H87: 'Pieza',
  E48: 'Unidad de Servicio',
  HUR: 'Hora',
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const targetSlug = process.argv[2] || null;
  await dataSource.initialize();
  console.log('✅ DB conectada\n');

  const orgRepo = dataSource.getRepository(Organization);
  const clientRepo = dataSource.getRepository(Client);
  const creditRepo = dataSource.getRepository(ClientCredit);
  const provRepo = dataSource.getRepository(Provider);
  const productRepo = dataSource.getRepository(Product);
  const unitRepo = dataSource.getRepository(MeasurementUnit);
  const brandRepo = dataSource.getRepository(Brand);
  const catRepo = dataSource.getRepository(Category);
  const whRepo = dataSource.getRepository(Warehouse);
  const currRepo = dataSource.getRepository(Currency);
  const invRepo = dataSource.getRepository(Inventory);
  const wdRepo = dataSource.getRepository(Withdrawal);
  const wdDetRepo = dataSource.getRepository(WithdrawalDetail);
  const quotRepo = dataSource.getRepository(Quotation);
  const quotDetRepo = dataSource.getRepository(QuotationDetail);
  const poRepo = dataSource.getRepository(PurchaseOrder);
  const poDetRepo = dataSource.getRepository(PurchaseOrderDetail);
  const expCatRepo = dataSource.getRepository(ExpenseCategory);
  const expRepo = dataSource.getRepository(Expense);
  const arRepo = dataSource.getRepository(AccountReceivable);
  const cashRegRepo = dataSource.getRepository(CashRegister);
  const cashTxRepo = dataSource.getRepository(CashTransaction);
  const userRepo = dataSource.getRepository(User);

  // ── Organización ─────────────────────────────────────────────────────────────
  if (!targetSlug) {
    const orgs = await orgRepo.find({ order: { created_at: 'ASC' }, take: 10 });
    if (!orgs.length) {
      console.error('❌ No hay organizaciones');
      process.exit(1);
    }
    console.log('Organizaciones disponibles:');
    orgs.forEach((o) => console.log(`  • ${o.slug.padEnd(20)} ${o.name}`));
    console.log('\nUso: npm run seed:demo -- <slug>');
    process.exit(0);
  }

  const org = await orgRepo.findOne({ where: { slug: targetSlug } });
  if (!org) {
    console.error(`❌ Organización "${targetSlug}" no encontrada`);
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`🏢 ${org.name} (${org.slug})\n`);

  // ── Moneda ───────────────────────────────────────────────────────────────────
  let currency = await currRepo.findOne({
    where: { organization_id: orgId, code: 'MXN' },
  });
  if (!currency) {
    currency = await currRepo.save(
      currRepo.create({
        organization_id: orgId,
        code: 'MXN',
        name: 'Peso Mexicano',
      }),
    );
  }
  const currencyId = currency.id;

  // ── Marcas ───────────────────────────────────────────────────────────────────
  console.log('🏷️  Marcas...');
  const brandMap = new Map<string, Brand>();
  for (const bName of [...new Set(PRODUCTS.map((p) => p.brand))]) {
    const code = bName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .substring(0, 20);
    let b = await brandRepo.findOne({
      where: { code, organization_id: orgId },
    });
    if (!b)
      b = await brandRepo.save(
        brandRepo.create({
          code,
          description: bName,
          organization_id: orgId,
          isActive: true,
        }),
      );
    brandMap.set(bName, b);
  }
  console.log(`   ✅ ${brandMap.size} marcas`);

  // ── Categorías ───────────────────────────────────────────────────────────────
  console.log('📂 Categorías...');
  const catMap = new Map<string, Category>();
  for (const cName of [...new Set(PRODUCTS.map((p) => p.cat))]) {
    const slug = cName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-');
    let c = await catRepo.findOne({
      where: { name: cName, organization_id: orgId },
    });
    if (!c)
      c = await catRepo.save(
        catRepo.create({
          name: cName,
          slug,
          description: cName,
          organization_id: orgId,
          isActive: true,
        }),
      );
    catMap.set(cName, c);
  }
  console.log(`   ✅ ${catMap.size} categorías`);

  // ── Unidades de medida ───────────────────────────────────────────────────────
  console.log('📏 Unidades...');
  const unitMap = new Map<string, MeasurementUnit>();
  for (const uCode of [...new Set(PRODUCTS.map((p) => p.unit))]) {
    let u = await unitRepo.findOne({
      where: { code: uCode, organization_id: orgId },
    });
    if (!u)
      u = await unitRepo.save(
        unitRepo.create({
          code: uCode,
          description: UNIT_DESC[uCode] || uCode,
          organization_id: orgId,
          status: true,
        }),
      );
    unitMap.set(uCode, u);
  }
  console.log(`   ✅ ${unitMap.size} unidades`);

  // ── Clientes + crédito ───────────────────────────────────────────────────────
  console.log('👥 Clientes...');
  const clients: Client[] = [];
  for (let i = 1; i <= 25; i++) {
    const isCompany = i % 4 === 0;
    const name = isCompany ? fakeCompany() : fakeName();
    const code = `CLI${pad(i)}`;
    let client = await clientRepo.findOne({
      where: { code, organization_id: orgId },
    });
    if (!client) {
      client = await clientRepo.save(
        clientRepo.create({
          code,
          name,
          description: name,
          email: fakeEmail(name),
          phone: fakePhone(),
          status: true,
          organization_id: orgId,
        }),
      );
    }
    clients.push(client);

    // Crédito para 1 de cada 3 clientes
    if (i % 3 === 0) {
      const existing = await creditRepo.findOne({
        where: { client_id: client.id },
      });
      if (!existing) {
        await creditRepo.save(
          creditRepo.create({
            client_id: client.id,
            credit_limit: pick([5000, 10000, 15000, 20000, 30000, 50000]),
            credit_days: pick([15, 30, 45, 60]),
            is_active: true,
            currency_id: currencyId,
          }),
        );
      }
    }
    process.stdout.write('.');
  }
  console.log(
    `\n   ✅ ${clients.length} clientes (${Math.floor(clients.length / 3)} con crédito)`,
  );

  // ── Proveedores ──────────────────────────────────────────────────────────────
  console.log('🏭 Proveedores...');
  const providers: Provider[] = [];
  for (let i = 1; i <= 12; i++) {
    const name = fakeCompany();
    const code = `PROV${pad(i)}`;
    let prov = await provRepo.findOne({
      where: { code, organization_id: orgId },
    });
    if (!prov) {
      prov = await provRepo.save(
        provRepo.create({
          code,
          name,
          description: `Proveedor de ${pick(['abarrotes', 'lácteos', 'bebidas', 'higiene', 'limpieza', 'servicios'])}`,
          email: fakeEmail(name),
          phone: fakePhone(),
          status: true,
          organization_id: orgId,
        }),
      );
    }
    providers.push(prov);
    process.stdout.write('.');
  }
  console.log(`\n   ✅ ${providers.length} proveedores`);

  // ── Productos ────────────────────────────────────────────────────────────────
  console.log('📦 Productos...');
  const products: Product[] = [];
  for (const p of PRODUCTS) {
    let prod = await productRepo.findOne({
      where: { sku: p.sku, organization_id: orgId },
    });
    if (!prod) {
      const slug = p.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      prod = await productRepo.save(
        productRepo.create({
          name: p.name,
          slug,
          sku: p.sku,
          code: p.code,
          description: p.name,
          base_price: p.price,
          type: p.type,
          inventory_strategy: InventoryStrategy.AVERAGE,
          measurement_unit: unitMap.get(p.unit)!,
          brand: brandMap.get(p.brand),
          category: catMap.get(p.cat),
          is_active: true,
          total_stock: 0,
          min_stock: p.type === ProductType.TANGIBLE ? rnd(5, 20) : 0,
          organization_id: orgId,
        }),
      );
    }
    products.push(prod);
    process.stdout.write('.');
  }
  console.log(`\n   ✅ ${products.length} productos`);

  // ── Almacenes ────────────────────────────────────────────────────────────────
  console.log('🏪 Almacenes...');
  const whData = [
    {
      code: 'ALM-CENTRAL',
      name: 'Almacén Central',
      address: 'Blvd. Principal 100',
    },
    { code: 'ALM-NORTE', name: 'Sucursal Norte', address: 'Av. Norte 250' },
    { code: 'ALM-SUR', name: 'Sucursal Sur', address: 'Calle Sur 75' },
  ];
  const warehouses: Warehouse[] = [];
  for (const w of whData) {
    let wh = await whRepo.findOne({
      where: { code: w.code, organization_id: orgId },
    });
    if (!wh) {
      wh = await whRepo.save(
        whRepo.create({
          code: w.code,
          name: w.name,
          address: w.address,
          phone: fakePhone(),
          status: true,
          isOpen: true,
          currencyId: currencyId,
          organization_id: orgId,
        }),
      );
    }
    warehouses.push(wh);
    process.stdout.write('.');
  }
  console.log(`\n   ✅ ${warehouses.length} almacenes`);

  // ── Inventario ───────────────────────────────────────────────────────────────
  console.log('📊 Inventario...');
  const tangibles = products.filter((p) => p.type === ProductType.TANGIBLE);
  let invCount = 0;
  for (const prod of tangibles) {
    for (const wh of warehouses) {
      const exists = await invRepo.findOne({
        where: {
          product_id: prod.id,
          warehouse_id: wh.id,
          organization_id: orgId,
        },
      });
      if (exists) continue;
      const qty = rnd(30, 300);
      await invRepo.save(
        invRepo.create({
          product_id: prod.id,
          warehouse_id: wh.id,
          organization_id: orgId,
          quantity: qty,
          price: round2(prod.base_price * 0.65),
          batch_number: `LOTE-${pad(rnd(1, 999))}`,
        }),
      );
      await productRepo.increment({ id: prod.id }, 'total_stock', qty);
      invCount++;
    }
  }
  console.log(`   ✅ ${invCount} registros de inventario`);

  // ── Cotizaciones ─────────────────────────────────────────────────────────────
  console.log('📋 Cotizaciones...');
  const quotStatuses = [
    QuotationStatus.DRAFT,
    QuotationStatus.SENT,
    QuotationStatus.ACCEPTED,
    QuotationStatus.REJECTED,
    QuotationStatus.EXPIRED,
  ];
  let quotCount = 0;
  for (let i = 1; i <= 20; i++) {
    const code = `COT${pad(i, 4)}`;
    const exists = await quotRepo.findOne({
      where: { code, organization_id: orgId },
    });
    if (exists) continue;

    const client = pick(clients);
    const warehouse = pick(warehouses);
    const daysAgo = rnd(1, 90);
    const date = fakeDate(daysAgo);
    const validUntil = new Date(date);
    validUntil.setDate(validUntil.getDate() + 30);
    const status = pick(quotStatuses);

    const quot = await quotRepo.save(
      quotRepo.create({
        code,
        date,
        valid_until: validUntil,
        client,
        warehouse,
        status,
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: `Cotización generada automáticamente para ${client.name}`,
        organization_id: orgId,
      }),
    );

    const numItems = rnd(1, 5);
    const selectedProds = [...products]
      .sort(() => Math.random() - 0.5)
      .slice(0, numItems);
    let subtotal = 0;
    for (const prod of selectedProds) {
      const qty = rnd(1, 10);
      const price = round2(prod.base_price * (1 + rnd(-5, 10) / 100));
      const discPct = pick([0, 0, 0, 5, 10]);
      const discAmt = round2((qty * price * discPct) / 100);
      const sub = round2(qty * price - discAmt);
      subtotal += sub;
      await quotDetRepo.save(
        quotDetRepo.create({
          quotation: quot,
          product: prod,
          quantity: qty,
          price,
          discount_percentage: discPct,
          discount_amount: discAmt,
          subtotal: sub,
        }),
      );
    }
    const tax = round2(subtotal * 0.16);
    await quotRepo.update(quot.id, {
      subtotal: round2(subtotal),
      tax,
      total: round2(subtotal + tax),
    });
    quotCount++;
    process.stdout.write('.');
  }
  console.log(`\n   ✅ ${quotCount} cotizaciones`);

  // ── Órdenes de compra ────────────────────────────────────────────────────────
  console.log('🛍️  Órdenes de compra...');
  const poStatuses = ['PENDING', 'APPROVED', 'PENDING', 'COMPLETED', 'PENDING'];
  let poCount = 0;
  for (let i = 1; i <= 15; i++) {
    const code = `OC${pad(i, 4)}`;
    const exists = await poRepo.findOne({
      where: { code, organization_id: orgId },
    });
    if (exists) continue;

    const provider = pick(providers);
    const warehouse = pick(warehouses);
    const daysAgo = rnd(1, 60);
    const date = fakeDate(daysAgo);
    const delivery = new Date(date);
    delivery.setDate(delivery.getDate() + rnd(7, 30));
    const status = pick(poStatuses);

    const po = await poRepo.save(
      poRepo.create({
        code,
        date,
        provider,
        warehouse,
        status,
        document: `DOC-${pad(rnd(1000, 9999), 4)}`,
        amount: 0,
        notes: `Orden de compra para ${provider.name}`,
        expected_delivery_date: delivery,
        organization_id: orgId,
      }),
    );

    const numItems = rnd(2, 6);
    const selectedProds = [...tangibles]
      .sort(() => Math.random() - 0.5)
      .slice(0, numItems);
    let total = 0;
    for (const prod of selectedProds) {
      const qty = rnd(10, 100);
      const price = round2(prod.base_price * 0.65);
      total += qty * price;
      await poDetRepo.save(
        poDetRepo.create({
          purchaseOrder: po,
          product: prod,
          warehouse,
          quantity: qty,
          price,
          received_quantity: status === 'COMPLETED' ? qty : 0,
        }),
      );
    }
    await poRepo.update(po.id, { amount: round2(total) });
    poCount++;
    process.stdout.write('.');
  }
  console.log(`\n   ✅ ${poCount} órdenes de compra`);

  // ── Usuario admin de la org (para createdBy) ─────────────────────────────────
  const adminUser = await userRepo.findOne({
    where: { organization_id: orgId },
  });
  const adminId = adminUser?.id || orgId; // fallback al orgId si no hay usuario

  // ── Clientes con crédito (para ventas a crédito) ──────────────────────────────
  const creditClients: Client[] = [];
  for (const client of clients) {
    const credit = await creditRepo.findOne({
      where: { client_id: client.id, is_active: true },
    });
    if (credit) creditClients.push(client);
  }

  // ── Ventas ───────────────────────────────────────────────────────────────────
  console.log('🛒 Ventas...');
  const today = new Date();
  const daysInMonth = today.getDate();
  const salesPerDay = 3;
  const totalSales = daysInMonth * salesPerDay;
  let saleCount = 0;
  let arCount = 0;

  for (let i = 1; i <= totalSales; i++) {
    const code = `VTA${pad(i, 4)}`;
    const exists = await wdRepo.findOne({
      where: { code, organization_id: orgId },
    });
    if (exists) continue;

    // 25% ventas a crédito — solo si hay clientes con crédito
    const useCredit = creditClients.length > 0 && i % 4 === 0;
    const client = useCredit ? pick(creditClients) : pick(clients);
    const paymentMethod = useCredit
      ? PaymentMethod.CREDIT
      : pick([PaymentMethod.CASH, PaymentMethod.CASH, PaymentMethod.CARD]);

    const dayOfMonth = Math.ceil(i / salesPerDay);
    const saleDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      dayOfMonth,
      rnd(8, 20),
      rnd(0, 59),
    );

    const wdEntity = wdRepo.create({
      code,
      client,
      amount: 0,
      type: WithdrawalType.WITHDRAWAL,
      status: WithdrawalStatus.CLOSED,
      paymentMethod,
      organization_id: orgId,
    });
    (wdEntity as any).created_at = saleDate;
    const wd = await wdRepo.save(wdEntity);

    const numItems = rnd(1, 5);
    const selectedProds = [...products]
      .sort(() => Math.random() - 0.5)
      .slice(0, numItems);
    let total = 0;
    for (const prod of selectedProds) {
      const qty = rnd(1, 8);
      const price = round2(prod.base_price * (1 + rnd(-10, 15) / 100));
      await wdDetRepo.save(
        wdDetRepo.create({
          withdrawal: wd,
          product: prod,
          quantity: qty,
          price,
        }),
      );
      total += qty * price;
    }
    const saleTotal = round2(total);
    await wdRepo.update(wd.id, { amount: saleTotal });

    // Crear cuenta por cobrar para ventas a crédito
    if (useCredit) {
      const refNum = `CXC${pad(i, 4)}`;
      const arExists = await arRepo.findOne({
        where: { referenceNumber: refNum, organization_id: orgId },
      });
      if (!arExists) {
        const dueDate = new Date(saleDate);
        dueDate.setDate(dueDate.getDate() + pick([15, 30, 45, 60]));
        const isPaid = i % 3 === 0; // 1/3 ya pagadas
        const paidAmt = isPaid
          ? saleTotal
          : i % 2 === 0
            ? round2(saleTotal * 0.5)
            : 0;
        const status = isPaid
          ? AccountReceivableStatus.PAID
          : paidAmt > 0
            ? AccountReceivableStatus.PARTIAL
            : dueDate < today
              ? AccountReceivableStatus.OVERDUE
              : AccountReceivableStatus.PENDING;

        await arRepo.save(
          arRepo.create({
            referenceNumber: refNum,
            totalAmount: saleTotal,
            paidAmount: paidAmt,
            remainingAmount: round2(saleTotal - paidAmt),
            issueDate: saleDate,
            dueDate,
            status,
            clientId: client.id,
            notes: `Venta a crédito ${code}`,
            organization_id: orgId,
          }),
        );
        arCount++;
      }
    }

    saleCount++;
    process.stdout.write('.');
  }
  console.log(
    `\n   ✅ ${saleCount} ventas (${salesPerDay}/día × ${daysInMonth} días), ${arCount} cuentas por cobrar`,
  );

  // ── Categorías de gastos ──────────────────────────────────────────────────────
  console.log('💸 Gastos...');
  const expCatData = [
    { name: 'Renta', color: '#EF4444' },
    { name: 'Servicios', color: '#F97316' },
    { name: 'Nómina', color: '#EAB308' },
    { name: 'Proveedores', color: '#22C55E' },
    { name: 'Mantenimiento', color: '#3B82F6' },
    { name: 'Marketing', color: '#8B5CF6' },
    { name: 'Transporte', color: '#06B6D4' },
    { name: 'Otros', color: '#6B7280' },
  ];
  const expCatMap = new Map<string, ExpenseCategory>();
  for (const ec of expCatData) {
    let cat = await expCatRepo.findOne({
      where: { name: ec.name, organization_id: orgId },
    });
    if (!cat)
      cat = await expCatRepo.save(
        expCatRepo.create({
          name: ec.name,
          color: ec.color,
          organization_id: orgId,
          isActive: true,
        }),
      );
    expCatMap.set(ec.name, cat);
  }

  const expenseTemplates = [
    {
      desc: 'Renta del local',
      cat: 'Renta',
      amount: 15000,
      recurrence: ExpenseRecurrence.MONTHLY,
    },
    {
      desc: 'Luz y agua',
      cat: 'Servicios',
      amount: 2800,
      recurrence: ExpenseRecurrence.MONTHLY,
    },
    {
      desc: 'Internet y teléfono',
      cat: 'Servicios',
      amount: 1200,
      recurrence: ExpenseRecurrence.MONTHLY,
    },
    {
      desc: 'Nómina quincenal',
      cat: 'Nómina',
      amount: 22000,
      recurrence: ExpenseRecurrence.MONTHLY,
    },
    {
      desc: 'Compra a proveedor',
      cat: 'Proveedores',
      amount: 8500,
      recurrence: ExpenseRecurrence.NONE,
    },
    {
      desc: 'Mantenimiento equipo',
      cat: 'Mantenimiento',
      amount: 3200,
      recurrence: ExpenseRecurrence.NONE,
    },
    {
      desc: 'Publicidad en redes',
      cat: 'Marketing',
      amount: 2500,
      recurrence: ExpenseRecurrence.MONTHLY,
    },
    {
      desc: 'Gasolina y fletes',
      cat: 'Transporte',
      amount: 1800,
      recurrence: ExpenseRecurrence.NONE,
    },
    {
      desc: 'Papelería y consumibles',
      cat: 'Otros',
      amount: 650,
      recurrence: ExpenseRecurrence.NONE,
    },
    {
      desc: 'Seguro del negocio',
      cat: 'Otros',
      amount: 4200,
      recurrence: ExpenseRecurrence.MONTHLY,
    },
  ];

  let expCount = 0;
  for (let i = 0; i < expenseTemplates.length * 2; i++) {
    const tmpl = expenseTemplates[i % expenseTemplates.length];
    const daysAgo = rnd(0, daysInMonth - 1);
    const expDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - daysAgo,
    );
    const dueDate = new Date(expDate);
    dueDate.setDate(dueDate.getDate() + rnd(0, 15));
    const amount = round2(tmpl.amount * (1 + rnd(-10, 10) / 100));
    const isPaid = i % 3 !== 0;
    const status = isPaid
      ? ExpenseStatus.PAID
      : dueDate < today
        ? ExpenseStatus.PENDING
        : ExpenseStatus.APPROVED;

    await expRepo.save(
      expRepo.create({
        description: tmpl.desc,
        amount,
        paidAmount: isPaid ? amount : 0,
        remainingAmount: isPaid ? 0 : amount,
        expenseDate: expDate,
        dueDate,
        status,
        recurrence: tmpl.recurrence,
        category: expCatMap.get(tmpl.cat)!,
        categoryId: expCatMap.get(tmpl.cat)!.id,
        provider: i % 4 === 0 ? pick(providers) : undefined,
        createdBy: adminId,
        organization_id: orgId,
      }),
    );
    expCount++;
    process.stdout.write('.');
  }
  console.log(`\n   ✅ ${expCount} gastos (${expCatMap.size} categorías)`);

  // ── Caja registradora ─────────────────────────────────────────────────────────
  console.log('🏧 Caja registradora...');
  let cashReg = await cashRegRepo.findOne({
    where: { code: 'CAJA-01', organization_id: orgId },
  });
  if (!cashReg) {
    cashReg = await cashRegRepo.save(
      cashRegRepo.create({
        code: 'CAJA-01',
        name: 'Caja Principal',
        description: 'Caja registradora principal',
        initialAmount: 5000,
        currentAmount: 5000,
        status: CashRegisterStatus.OPEN,
        openedAt: new Date(today.getFullYear(), today.getMonth(), 1),
        openedBy: adminId,
        organization_id: orgId,
      }),
    );
  }

  const txTypes = [
    {
      type: CashTransactionType.SALE,
      desc: 'Venta en efectivo',
      method: CashPaymentMethod.CASH,
      factor: 1,
    },
    {
      type: CashTransactionType.SALE,
      desc: 'Venta con tarjeta',
      method: CashPaymentMethod.CARD,
      factor: 1,
    },
    {
      type: CashTransactionType.DEPOSIT,
      desc: 'Depósito inicial',
      method: CashPaymentMethod.CASH,
      factor: 1,
    },
    {
      type: CashTransactionType.WITHDRAWAL,
      desc: 'Retiro para gastos',
      method: CashPaymentMethod.CASH,
      factor: -1,
    },
    {
      type: CashTransactionType.ADJUSTMENT,
      desc: 'Ajuste de caja',
      method: CashPaymentMethod.CASH,
      factor: 1,
    },
  ];

  let txCount = 0;
  let runningBalance = 5000;
  for (let i = 1; i <= 30; i++) {
    const tmpl = pick(txTypes);
    const amount = round2(rnd(200, 3500));
    runningBalance += tmpl.factor * amount;

    await cashTxRepo.save(
      cashTxRepo.create({
        cashRegisterId: cashReg.id,
        type: tmpl.type,
        amount,
        description: tmpl.desc,
        reference: `REF-${pad(i, 4)}`,
        paymentMethod: tmpl.method,
        createdBy: adminId,
      }),
    );
    txCount++;
  }
  await cashRegRepo.update(cashReg.id, {
    currentAmount: round2(runningBalance),
  });
  console.log(
    `   ✅ ${txCount} transacciones de caja (balance: $${round2(runningBalance).toLocaleString()})`,
  );

  // ── Resumen ───────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(55));
  console.log('🎉 Demo data creada exitosamente');
  console.log(`   Organización    : ${org.name}`);
  console.log(`   Marcas          : ${brandMap.size}`);
  console.log(`   Categorías      : ${catMap.size}`);
  console.log(`   Unidades        : ${unitMap.size}`);
  console.log(
    `   Clientes        : ${clients.length} (${creditClients.length} con crédito)`,
  );
  console.log(`   Proveedores     : ${providers.length}`);
  console.log(`   Productos       : ${products.length}`);
  console.log(`   Almacenes       : ${warehouses.length}`);
  console.log(`   Inventario      : ${invCount} registros`);
  console.log(`   Cotizaciones    : ${quotCount}`);
  console.log(`   Órdenes compra  : ${poCount}`);
  console.log(
    `   Ventas          : ${saleCount} (~${salesPerDay}/día × ${daysInMonth} días)`,
  );
  console.log(`   Cuentas x cobrar: ${arCount}`);
  console.log(
    `   Gastos          : ${expCount} (${expCatMap.size} categorías)`,
  );
  console.log(`   Transac. caja   : ${txCount}`);
  console.log('═'.repeat(55));
  console.log('═'.repeat(55));

  await dataSource.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌', err?.message || err);
  process.exit(1);
});
