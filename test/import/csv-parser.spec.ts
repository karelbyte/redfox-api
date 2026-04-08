/**
 * Tests unitarios para los parsers CSV de importación.
 * Verifican que:
 * 1. Las filas de metadatos de la plantilla se ignoran
 * 2. Los datos reales se parsean correctamente
 * 3. Las validaciones básicas funcionan
 */

import { ClientImportService } from '../../src/services/client-import.service';
import { ProductImportService } from '../../src/services/product-import.service';
import { ProviderImportService } from '../../src/services/provider-import.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeClientService(): ClientImportService {
  return new (ClientImportService as any)(
    {}, {}, {}, // repos vacíos — no se usan en parseCSV
    { getOrganizationId: () => 'org-1' },
    {},
  );
}

function makeProductService(): ProductImportService {
  return new (ProductImportService as any)(
    {}, {}, {}, {}, {},
    { getOrganizationId: () => 'org-1' },
  );
}

function makeProviderService(): ProviderImportService {
  return new (ProviderImportService as any)(
    {}, {}, {},
    { getOrganizationId: () => 'org-1' },
  );
}

function csv(...rows: string[]): Buffer {
  return Buffer.from(rows.join('\r\n'), 'utf-8');
}

// ─── Clientes ────────────────────────────────────────────────────────────────

describe('ClientImportService.parseCSV', () => {
  let service: ClientImportService;
  beforeEach(() => { service = makeClientService(); });

  it('parsea filas de datos correctamente', () => {
    const buf = csv(
      'code,name,email',
      'CLI001,Juan Pérez,juan@test.com',
      'CLI002,Empresa XYZ,xyz@test.com',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0].code).toBe('CLI001');
    expect(rows[1].name).toBe('Empresa XYZ');
  });

  it('ignora filas de metadatos REQUERIDO/opcional', () => {
    const buf = csv(
      'code,name,email,status',
      'REQUERIDO,REQUERIDO,opcional,opcional',   // fila de metadatos
      'Tipo: texto,Tipo: texto,Tipo: email,Tipo: opción', // fila de tipos
      'CLI001,Juan Pérez,juan@test.com,true',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('CLI001');
  });

  it('ignora filas de metadatos en inglés (REQUIRED/optional)', () => {
    const buf = csv(
      'code,name',
      'REQUIRED,REQUIRED',
      'optional,optional',
      'CLI001,Test',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(1);
  });

  it('ignora filas de metadatos en chino', () => {
    const buf = csv(
      'code,name',
      '必填,必填',
      '可选,可选',
      'CLI001,Test',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(1);
  });

  it('soporta separador punto y coma', () => {
    const buf = csv(
      'code;name;email',
      'CLI001;Juan;juan@test.com',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('CLI001');
  });

  it('lanza error si el archivo no tiene datos suficientes', () => {
    const buf = csv('code,name');
    expect(() => service.parseCSV(buf)).toThrow();
  });

  it('parsea la plantilla completa descargada sin errores de metadatos', () => {
    // Simula exactamente lo que genera downloadTemplate()
    const buf = csv(
      'code,name,description,phone,email,status,tax_document,tax_name,tax_system,invoice_use,address_zip,address_street,address_city,address_state,address_country',
      'REQUERIDO,REQUERIDO,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional',
      'CLI001,Juan Pérez,Cliente frecuente,+52 555 123 4567,juan@email.com,true,PEPJ800101AAA,Juan Pérez,616,G03,85900,Av. Principal 123,Hermosillo,Sonora,MEX',
      'CLI002,Empresa XYZ S.A.,Distribuidora,+52 555 987 6543,contacto@xyz.com,true,EXY010101AAA,Empresa XYZ S.A. de C.V.,601,G01,06600,Insurgentes Sur 1234,CDMX,CDMX,MEX',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0].code).toBe('CLI001');
    expect(rows[0].tax_document).toBe('PEPJ800101AAA');
    expect(rows[0].address_zip).toBe('85900');
  });
});

// ─── Productos ───────────────────────────────────────────────────────────────

describe('ProductImportService.parseCSV', () => {
  let service: ProductImportService;
  beforeEach(() => { service = makeProductService(); });

  it('parsea filas de datos correctamente', () => {
    const buf = csv(
      'name,sku,code,measurement_unit',
      'Leche Entera,LECH-001,50211503,LTR',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0].sku).toBe('LECH-001');
    expect(rows[0].code).toBe('50211503');
  });

  it('ignora filas de metadatos de la plantilla', () => {
    const buf = csv(
      'name,sku,code,measurement_unit,description,base_price',
      'REQUERIDO,REQUERIDO,REQUERIDO,REQUERIDO,opcional,opcional',
      'Tipo: texto,Tipo: texto,Tipo: texto,Tipo: código,Tipo: texto,Tipo: decimal',
      'Leche Entera,LECH-001,50211503,LTR,Leche pasteurizada,25.00',
      'Servicio de Instalación,SERV-001,81111500,E48,Servicio técnico,500.00',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Leche Entera');
  });

  it('parsea la plantilla completa descargada sin errores de metadatos', () => {
    const buf = csv(
      'name,sku,code,measurement_unit,description,base_price,type,inventory_strategy,brand,category,barcode,min_stock,weight,width,height,length',
      'REQUERIDO,REQUERIDO,REQUERIDO,REQUERIDO,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional,opcional',
      'Leche Entera 1L,LECH-001,50211503,LTR,Leche entera pasteurizada 1 litro,25.00,tangible,average,Lala,Lácteos,7501055300018,10,1.0,0.10,0.25,0.10',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0].sku).toBe('LECH-001');
  });
});

// ─── Proveedores ─────────────────────────────────────────────────────────────

describe('ProviderImportService.parseCSV', () => {
  let service: ProviderImportService;
  beforeEach(() => { service = makeProviderService(); });

  it('parsea filas de datos correctamente', () => {
    const buf = csv(
      'code,name,email',
      'PROV001,Distribuidora ABC,abc@test.com',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('PROV001');
  });

  it('ignora filas de metadatos de la plantilla', () => {
    const buf = csv(
      'code,name,description,phone,email,status',
      'REQUERIDO,REQUERIDO,opcional,opcional,opcional,opcional',
      'Tipo: texto,Tipo: texto,Tipo: texto,Tipo: texto,Tipo: email,Tipo: opción',
      'PROV001,Distribuidora ABC,Proveedor de lácteos,+52 555 123 4567,abc@test.com,true',
    );
    const rows = service.parseCSV(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('PROV001');
  });
});
