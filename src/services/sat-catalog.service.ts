import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

export interface SatProductKey {
  key: string;
  description: string;
  score?: number;
}

export interface SatUnitKey {
  key: string;
  description: string;
}

const SAT_CACHE_TTL = 60 * 60 * 24; // 24 horas
const SAT_FETCH_HEADERS = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' };

@Injectable()
export class SatCatalogService {
  private readonly logger = new Logger(SatCatalogService.name);
  private readonly productsUrl: string;
  private readonly unitsUrl: string;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.productsUrl = this.configService.get<string>(
      'SAT_CATALOG_PRODUCTS_URL',
      'https://factura123.mx/api/v2/public/cat/prodclasses',
    );
    this.unitsUrl = this.configService.get<string>(
      'SAT_CATALOG_UNITS_URL',
      'https://factura123.mx/api/v2/public/cat/units',
    );
  }

  /**
   * Busca claves de producto SAT con caché Redis de 24h.
   * Ambos PACs (FacturaAPI y Factura Green) usan el mismo endpoint público.
   */
  async searchProductKeys(term: string): Promise<SatProductKey[]> {
    if (!term?.trim()) return this.getStaticProductKeys('');

    const cacheKey = `sat:products:${term.toLowerCase().trim()}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch { /* ignorar error de parse */ }
    }

    try {
      const response = await fetch(
        `${this.productsUrl}?search=${encodeURIComponent(term)}&order=asc&offset=0&limit=20`,
        { headers: SAT_FETCH_HEADERS },
      );

      if (!response.ok) {
        this.logger.warn(`SAT product search failed (${response.status}) for term: ${term}`);
        return this.getStaticProductKeys(term);
      }

      const data = await response.json();
      const items = data.rows || data.data || data || [];
      const results: SatProductKey[] = items.map((item: any) => ({
        key: item.clavesat || item.clave || item.code || item.key,
        description: item.descripcion || item.description || item.name,
        score: 0,
      })).sort((a: SatProductKey, b: SatProductKey) =>
        (a.description?.length || 0) - (b.description?.length || 0),
      );

      await this.redisService.set(cacheKey, JSON.stringify(results), SAT_CACHE_TTL);
      return results;
    } catch (error: any) {
      this.logger.warn(`SAT product search error: ${error?.message}`);
      return this.getStaticProductKeys(term);
    }
  }

  /**
   * Busca unidades de medida SAT con caché Redis de 24h.
   */
  async searchMeasurementUnits(term: string): Promise<SatUnitKey[]> {
    if (!term?.trim()) return this.getStaticUnits('');

    const cacheKey = `sat:units:${term.toLowerCase().trim()}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch { /* ignorar error de parse */ }
    }

    try {
      const response = await fetch(
        `${this.unitsUrl}?search=${encodeURIComponent(term)}&order=asc&offset=0&limit=20`,
        { headers: SAT_FETCH_HEADERS },
      );

      if (!response.ok) {
        this.logger.warn(`SAT units search failed (${response.status}) for term: ${term}`);
        return this.getStaticUnits(term);
      }

      const data = await response.json();
      const items = data.rows || data.data || data || [];
      const results: SatUnitKey[] = items.map((item: any) => ({
        key: item.clavesat || item.clave || item.code || item.key,
        description: item.descripcion || item.description || item.name,
      })).sort((a: SatUnitKey, b: SatUnitKey) =>
        (a.description?.length || 0) - (b.description?.length || 0),
      );

      await this.redisService.set(cacheKey, JSON.stringify(results), SAT_CACHE_TTL);
      return results;
    } catch (error: any) {
      this.logger.warn(`SAT units search error: ${error?.message}`);
      return this.getStaticUnits(term);
    }
  }

  private getStaticProductKeys(term: string): SatProductKey[] {
    const products: SatProductKey[] = [
      { key: '01010101', description: 'No existe en el catálogo' },
      { key: '80141600', description: 'Servicios de consultoría' },
      { key: '81112000', description: 'Servicios de desarrollo de software' },
      { key: '81112001', description: 'Servicios de desarrollo de software de aplicación' },
      { key: '81161500', description: 'Servicios de diseño gráfico' },
      { key: '43230000', description: 'Computadoras' },
      { key: '43211500', description: 'Computadoras portátiles' },
      { key: '84111506', description: 'Servicios de facturación' },
      { key: '50211503', description: 'Leche' },
      { key: '50000000', description: 'Alimentos, bebidas y tabaco' },
    ];
    if (!term) return products;
    const lower = term.toLowerCase();
    return products.filter(p => p.key.includes(term) || p.description.toLowerCase().includes(lower));
  }

  private getStaticUnits(term: string): SatUnitKey[] {
    const units: SatUnitKey[] = [
      { key: 'H87', description: 'Pieza' },
      { key: 'EA',  description: 'Elemento' },
      { key: 'E48', description: 'Unidad de Servicio' },
      { key: 'ACT', description: 'Actividad' },
      { key: 'KGM', description: 'Kilogramo' },
      { key: 'LTR', description: 'Litro' },
      { key: 'MTR', description: 'Metro' },
      { key: 'MTK', description: 'Metro cuadrado' },
      { key: 'MTQ', description: 'Metro cúbico' },
      { key: 'GRM', description: 'Gramo' },
      { key: 'KT',  description: 'Kit' },
      { key: 'SET', description: 'Conjunto' },
      { key: 'XBX', description: 'Caja' },
      { key: 'HUR', description: 'Hora' },
      { key: 'MON', description: 'Mes' },
    ];
    if (!term) return units;
    const lower = term.toLowerCase();
    return units.filter(u => u.key.toLowerCase().includes(lower) || u.description.toLowerCase().includes(lower));
  }
}
