/**
 * Tests unitarios para ImportProcessor.
 * Verifican que:
 * 1. El processor llama al servicio correcto según el tipo de job
 * 2. El import_log se actualiza a 'completed' al terminar
 * 3. El import_log se actualiza a 'failed' si hay error
 * 4. Se crea una notificación al terminar
 */

import { ImportProcessor } from '../../src/processors/import.processor';
import {
  ImportLogType,
  ImportLogStatus,
} from '../../src/models/import-log.entity';

const mockLog = { id: 'log-1', status: ImportLogStatus.PENDING };

const mockImportLogService = {
  createPending: jest.fn().mockResolvedValue(mockLog),
  complete: jest.fn().mockResolvedValue(undefined),
  fail: jest.fn().mockResolvedValue(undefined),
};

const mockClientImportService = {
  importRows: jest.fn().mockResolvedValue({
    created: 5,
    skipped: 1,
    pack_synced: 2,
    pack_failed: 0,
    errors: [],
    pack_warnings: [],
    summary: '5 creados, 1 omitidos',
  }),
};

const mockProductImportService = {
  importRowsWithOrg: jest.fn().mockResolvedValue({
    created: 3,
    skipped: 0,
    errors: [],
    warnings: [],
    summary: '3 creados',
  }),
};

const mockProviderImportService = {
  importRows: jest.fn().mockResolvedValue({
    created: 2,
    skipped: 0,
    errors: [],
    summary: '2 creados',
  }),
};

const mockNotificationRepo = {
  create: jest.fn().mockReturnValue({}),
  save: jest.fn().mockResolvedValue({}),
};

const mockInMemoryQueue = {
  registerProcessor: jest.fn(),
};

function makeProcessor(): ImportProcessor {
  return new (ImportProcessor as any)(
    mockInMemoryQueue,
    mockClientImportService,
    mockProductImportService,
    mockProviderImportService,
    mockImportLogService,
    mockNotificationRepo,
  );
}

const baseJob = { userId: 'user-1', organizationId: 'org-1' };

describe('ImportProcessor', () => {
  let processor: ImportProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = makeProcessor();
  });

  it('registra el processor en InMemoryQueue al iniciar', () => {
    processor.onModuleInit();
    expect(mockInMemoryQueue.registerProcessor).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  describe('job type: client', () => {
    const job = {
      ...baseJob,
      type: 'client' as const,
      rows: [{ row: 1, code: 'C1', name: 'Test' }],
    };

    it('crea log pending al inicio', async () => {
      await processor.process(job);
      expect(mockImportLogService.createPending).toHaveBeenCalledWith(
        ImportLogType.CLIENT,
        'user-1',
        'org-1',
        1,
      );
    });

    it('llama a clientImportService.importRows con el orgId correcto', async () => {
      await processor.process(job);
      expect(mockClientImportService.importRows).toHaveBeenCalledWith(
        job.rows,
        'org-1',
      );
    });

    it('completa el log con los resultados', async () => {
      await processor.process(job);
      expect(mockImportLogService.complete).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          created_count: 5,
          skipped_count: 1,
          error_count: 0,
        }),
      );
    });

    it('crea una notificación de éxito', async () => {
      await processor.process(job);
      expect(mockNotificationRepo.save).toHaveBeenCalled();
    });
  });

  describe('job type: product', () => {
    const job = {
      ...baseJob,
      type: 'product' as const,
      rows: [
        {
          row: 1,
          name: 'P1',
          sku: 'SKU1',
          code: '12345678',
          measurement_unit: 'H87',
        },
      ],
    };

    it('llama a productImportService.importRowsWithOrg', async () => {
      await processor.process(job);
      expect(mockProductImportService.importRowsWithOrg).toHaveBeenCalledWith(
        job.rows,
        'org-1',
      );
    });

    it('completa el log correctamente', async () => {
      await processor.process(job);
      expect(mockImportLogService.complete).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          created_count: 3,
        }),
      );
    });
  });

  describe('job type: provider', () => {
    const job = {
      ...baseJob,
      type: 'provider' as const,
      rows: [{ row: 1, code: 'P1', name: 'Proveedor' }],
    };

    it('llama a providerImportService.importRows', async () => {
      await processor.process(job);
      expect(mockProviderImportService.importRows).toHaveBeenCalledWith(
        job.rows,
        'org-1',
      );
    });

    it('completa el log correctamente', async () => {
      await processor.process(job);
      expect(mockImportLogService.complete).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          created_count: 2,
        }),
      );
    });
  });

  describe('manejo de errores', () => {
    it('marca el log como failed si el servicio lanza error', async () => {
      mockClientImportService.importRows.mockRejectedValueOnce(
        new Error('DB connection lost'),
      );
      const job = { ...baseJob, type: 'client' as const, rows: [] };
      await processor.process(job);
      expect(mockImportLogService.fail).toHaveBeenCalledWith(
        'log-1',
        expect.stringContaining('DB connection lost'),
      );
    });

    it('crea notificación de error si falla', async () => {
      mockClientImportService.importRows.mockRejectedValueOnce(
        new Error('Timeout'),
      );
      const job = { ...baseJob, type: 'client' as const, rows: [] };
      await processor.process(job);
      expect(mockNotificationRepo.save).toHaveBeenCalled();
    });
  });
});
