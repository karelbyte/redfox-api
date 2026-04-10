/**
 * Tests unitarios para ClientImportService.importRows
 * Verifican: validaciones, duplicados, creación de tax_data, address y sync PAC.
 */

import { AddressType } from '../../src/models/client-address.entity';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockClientRepo = {
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation((d: any) => d),
  save: jest
    .fn()
    .mockImplementation((d: any) => Promise.resolve({ id: 'cli-1', ...d })),
};

const mockAddressRepo = {
  create: jest.fn().mockImplementation((d: any) => d),
  save: jest.fn().mockResolvedValue({}),
};

const mockTaxDataRepo = {
  create: jest.fn().mockImplementation((d: any) => d),
  save: jest.fn().mockResolvedValue({}),
};

const mockTenantContext = {
  getOrganizationId: jest.fn().mockReturnValue('org-1'),
};

const mockPackSyncService = {
  syncOnCreate: jest.fn().mockResolvedValue({ packSyncSuccess: true }),
};

async function makeService() {
  const { ClientImportService } = await import(
    '../../src/services/client-import.service'
  );
  return new (ClientImportService as any)(
    mockClientRepo,
    mockAddressRepo,
    mockTaxDataRepo,
    mockTenantContext,
    mockPackSyncService,
  );
}

const baseRow = {
  row: 2,
  code: 'CLI001',
  name: 'Juan Pérez',
  description: '',
  phone: '',
  email: '',
  status: 'true',
  tax_document: '',
  tax_name: '',
  tax_system: '',
  invoice_use: '',
  address_zip: '',
  address_street: '',
  address_city: '',
  address_state: '',
  address_country: '',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClientImportService.importRows', () => {
  let service: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClientRepo.findOne.mockResolvedValue(null);
    mockPackSyncService.syncOnCreate.mockResolvedValue({
      packSyncSuccess: true,
    });
    service = await makeService();
  });

  // ── Validaciones ──────────────────────────────────────────────────────────

  describe('validaciones', () => {
    it('rechaza fila sin code', async () => {
      const result = await service.importRows(
        [{ ...baseRow, code: '' }],
        'org-1',
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('code');
      expect(result.created).toBe(0);
    });

    it('rechaza code menor a 3 caracteres', async () => {
      const result = await service.importRows(
        [{ ...baseRow, code: 'AB' }],
        'org-1',
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('3');
    });

    it('rechaza code mayor a 50 caracteres', async () => {
      const result = await service.importRows(
        [{ ...baseRow, code: 'A'.repeat(51) }],
        'org-1',
      );
      expect(result.errors).toHaveLength(1);
    });

    it('rechaza fila sin name', async () => {
      const result = await service.importRows(
        [{ ...baseRow, name: '' }],
        'org-1',
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('name');
    });

    it('rechaza name menor a 3 caracteres', async () => {
      const result = await service.importRows(
        [{ ...baseRow, name: 'AB' }],
        'org-1',
      );
      expect(result.errors).toHaveLength(1);
    });

    it('rechaza email con formato inválido', async () => {
      const result = await service.importRows(
        [{ ...baseRow, email: 'no-es-email' }],
        'org-1',
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('email');
    });

    it('acepta email con formato válido', async () => {
      const result = await service.importRows(
        [{ ...baseRow, email: 'juan@test.com' }],
        'org-1',
      );
      expect(result.errors).toHaveLength(0);
      expect(result.created).toBe(1);
    });

    it('acepta fila sin email', async () => {
      const result = await service.importRows(
        [{ ...baseRow, email: '' }],
        'org-1',
      );
      expect(result.errors).toHaveLength(0);
      expect(result.created).toBe(1);
    });
  });

  // ── Duplicados ────────────────────────────────────────────────────────────

  describe('duplicados', () => {
    it('omite cliente con código duplicado y lo cuenta como skipped', async () => {
      mockClientRepo.findOne.mockResolvedValue({
        id: 'existing',
        code: 'CLI001',
      });
      const result = await service.importRows([{ ...baseRow }], 'org-1');
      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
      expect(result.errors[0].reason).toContain('ya existe');
    });
  });

  // ── Datos fiscales ────────────────────────────────────────────────────────

  describe('datos fiscales', () => {
    it('crea tax_data si viene tax_document', async () => {
      const row = {
        ...baseRow,
        tax_document: 'PEPJ800101AAA',
        tax_name: 'Juan Pérez',
        tax_system: '616',
      };
      await service.importRows([row], 'org-1');
      expect(mockTaxDataRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tax_document: 'PEPJ800101AAA',
          tax_system: '616',
          is_main: true,
        }),
      );
    });

    it('convierte tax_document a mayúsculas', async () => {
      const row = { ...baseRow, tax_document: 'pepj800101aaa' };
      await service.importRows([row], 'org-1');
      expect(mockTaxDataRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ tax_document: 'PEPJ800101AAA' }),
      );
    });

    it('no crea tax_data si no viene tax_document', async () => {
      await service.importRows([{ ...baseRow }], 'org-1');
      expect(mockTaxDataRepo.save).not.toHaveBeenCalled();
    });

    it('usa el name del cliente como tax_name si no se especifica', async () => {
      const row = { ...baseRow, tax_document: 'PEPJ800101AAA', tax_name: '' };
      await service.importRows([row], 'org-1');
      expect(mockTaxDataRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ tax_name: 'Juan Pérez' }),
      );
    });
  });

  // ── Dirección ─────────────────────────────────────────────────────────────

  describe('dirección', () => {
    it('crea address si viene address_zip', async () => {
      const row = {
        ...baseRow,
        address_zip: '85900',
        address_street: 'Av. Principal 123',
        address_city: 'Hermosillo',
      };
      await service.importRows([row], 'org-1');
      expect(mockAddressRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          zip_code: '85900',
          street: 'Av. Principal 123',
          city: 'Hermosillo',
          is_main: true,
        }),
      );
    });

    it('usa MEX como país por defecto si no se especifica', async () => {
      const row = { ...baseRow, address_zip: '85900', address_country: '' };
      await service.importRows([row], 'org-1');
      expect(mockAddressRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'MEX' }),
      );
    });

    it('no crea address si no viene address_zip', async () => {
      await service.importRows([{ ...baseRow }], 'org-1');
      expect(mockAddressRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── Sincronización PAC ────────────────────────────────────────────────────

  describe('sincronización PAC', () => {
    it('sincroniza al PAC solo si tiene tax_document Y address_zip', async () => {
      mockClientRepo.findOne
        .mockResolvedValueOnce(null) // no duplicado
        .mockResolvedValueOnce({ id: 'cli-1', addresses: [], taxData: [] }); // reload con relaciones

      const row = {
        ...baseRow,
        tax_document: 'PEPJ800101AAA',
        address_zip: '85900',
      };
      const result = await service.importRows([row], 'org-1');
      expect(mockPackSyncService.syncOnCreate).toHaveBeenCalled();
      expect(result.pack_synced).toBe(1);
    });

    it('NO sincroniza al PAC si solo tiene tax_document sin address_zip', async () => {
      const row = {
        ...baseRow,
        tax_document: 'PEPJ800101AAA',
        address_zip: '',
      };
      await service.importRows([row], 'org-1');
      expect(mockPackSyncService.syncOnCreate).not.toHaveBeenCalled();
    });

    it('NO sincroniza al PAC si solo tiene address_zip sin tax_document', async () => {
      const row = { ...baseRow, tax_document: '', address_zip: '85900' };
      await service.importRows([row], 'org-1');
      expect(mockPackSyncService.syncOnCreate).not.toHaveBeenCalled();
    });

    it('cuenta pack_failed si la sincronización falla', async () => {
      mockClientRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'cli-1', addresses: [], taxData: [] });
      mockPackSyncService.syncOnCreate.mockResolvedValue({
        packSyncSuccess: false,
        packErrorMessage: 'RFC inválido',
      });

      const row = {
        ...baseRow,
        tax_document: 'PEPJ800101AAA',
        address_zip: '85900',
      };
      const result = await service.importRows([row], 'org-1');
      expect(result.pack_failed).toBe(1);
      expect(result.pack_warnings[0].reason).toContain('RFC inválido');
    });
  });

  // ── Resumen ───────────────────────────────────────────────────────────────

  describe('resumen', () => {
    it('genera summary con los conteos correctos', async () => {
      const rows = [
        { ...baseRow, code: 'CLI001', name: 'Cliente 1' },
        { ...baseRow, code: 'CLI002', name: 'Cliente 2' },
        { ...baseRow, code: '', name: 'Sin código' }, // error
      ];
      const result = await service.importRows(rows, 'org-1');
      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.summary).toContain('2 creados');
    });

    it('reporta status false si viene "false" en status', async () => {
      const row = { ...baseRow, status: 'false' };
      await service.importRows([row], 'org-1');
      expect(mockClientRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: false }),
      );
    });

    it('reporta status true por defecto', async () => {
      await service.importRows([{ ...baseRow }], 'org-1');
      expect(mockClientRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: true }),
      );
    });
  });
});
