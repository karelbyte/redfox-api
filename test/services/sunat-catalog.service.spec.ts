import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { SunatCatalogService } from '../../src/services/sunat-catalog.service';
import { SunatProductCode } from '../../src/models/sunat-product-code.entity';

describe('SunatCatalogService', () => {
  let service: SunatCatalogService;
  let repository: jest.Mocked<any>;

  beforeEach(async () => {
    repository = { query: jest.fn().mockResolvedValue([]), count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SunatCatalogService,
        { provide: getRepositoryToken(SunatProductCode), useValue: repository },
      ],
    }).compile();

    service = module.get(SunatCatalogService);
  });

  it('no consulta la base con un término vacío', async () => {
    for (const term of ['', '   ', undefined as any, null as any]) {
      expect(await service.searchProductCodes(term)).toEqual([]);
    }
    expect(repository.query).not.toHaveBeenCalled();
  });

  it('devuelve código y descripción con la forma que espera el front', async () => {
    repository.query.mockResolvedValue([
      { code: '50202201', description: 'CERVEZA', is_restricted: false },
    ]);

    expect(await service.searchProductCodes('cerveza')).toEqual([
      { key: '50202201', description: 'CERVEZA' },
    ]);
  });

  /**
   * Los bienes de los anexos 25.1 a 25.3 exigen código desde el 1 de agosto
   * de 2026: sin él SUNAT rechaza el comprobante. Por eso salen marcados y
   * primeros en la lista.
   */
  it('marca los bienes cuyo código exige SUNAT', async () => {
    repository.query.mockResolvedValue([
      { code: '15101506', description: 'DIESEL', is_restricted: true },
    ]);

    const [first] = await service.searchProductCodes('diesel');
    expect(first.restricted).toBe(true);
  });

  it('recorta los espacios del término antes de buscar', async () => {
    await service.searchProductCodes('  arroz  ');

    expect(repository.query).toHaveBeenCalledWith(
      expect.any(String),
      ['arroz'],
    );
  });

  /**
   * La consulta tiene que escribir unaccent igual que el índice; si no,
   * Postgres deja de usarlo y la búsqueda pasa a recorrer 19.475 filas.
   */
  it('usa la misma expresión con la que está construido el índice', async () => {
    await service.searchProductCodes('cerveza');

    const [sql] = repository.query.mock.calls[0];
    expect(sql).toContain('immutable_unaccent(lower(description))');
    expect(sql).toContain('LIMIT 20');
  });
});
