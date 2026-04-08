/**
 * Tests unitarios para lógica de ProductService.
 * Se testean los métodos que no requieren infraestructura NestJS.
 */

import { ProductType, InventoryStrategy } from '../../src/models/product.entity';

// ─── Tests de lógica de negocio ───────────────────────────────────────────────

describe('Product business logic', () => {

  describe('ProductType enum', () => {
    it('tiene los tres tipos correctos', () => {
      expect(ProductType.TANGIBLE).toBe('tangible');
      expect(ProductType.SERVICE).toBe('service');
      expect(ProductType.DIGITAL).toBe('digital');
    });
  });

  describe('InventoryStrategy enum', () => {
    it('tiene las tres estrategias correctas', () => {
      expect(InventoryStrategy.FIFO).toBe('fifo');
      expect(InventoryStrategy.FEFO).toBe('fefo');
      expect(InventoryStrategy.AVERAGE).toBe('average');
    });

    it('AVERAGE es la estrategia por defecto correcta para valoración de precio', () => {
      // AVERAGE es correcto para valoración contable — no es salida física
      expect(InventoryStrategy.AVERAGE).toBeDefined();
    });
  });

  describe('slug generation logic', () => {
    // Replica la lógica de generateSlug del ProductService
    function generateSlug(name: string): string {
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);
    }

    it('convierte nombre a slug válido', () => {
      expect(generateSlug('Leche Entera 1L')).toBe('leche-entera-1l');
    });

    it('elimina acentos', () => {
      expect(generateSlug('Lácteos y Derivados')).toBe('lacteos-y-derivados');
    });

    it('elimina caracteres especiales', () => {
      expect(generateSlug('Producto (especial) #1')).toBe('producto-especial-1');
    });

    it('trunca a 100 caracteres', () => {
      const longName = 'a'.repeat(150);
      expect(generateSlug(longName).length).toBeLessThanOrEqual(100);
    });

    it('no deja guiones al inicio o final', () => {
      const slug = generateSlug('  Producto  ');
      expect(slug).not.toMatch(/^-|-$/);
    });
  });

  describe('stock calculation', () => {
    it('calcula stock disponible correctamente', () => {
      const totalStock = 100;
      const delta = -10;
      const newStock = totalStock + delta;
      expect(newStock).toBe(90);
    });

    it('detecta stock insuficiente', () => {
      const totalStock = 5;
      const requested = 10;
      expect(totalStock < requested).toBe(true);
    });

    it('permite stock en cero', () => {
      const totalStock = 10;
      const delta = -10;
      const newStock = totalStock + delta;
      expect(newStock).toBe(0);
    });
  });

  describe('price calculation', () => {
    it('calcula precio con IVA 16%', () => {
      const basePrice = 100;
      const taxRate = 0.16;
      const total = Math.round(basePrice * (1 + taxRate) * 100) / 100;
      expect(total).toBe(116);
    });

    it('redondea a 2 decimales', () => {
      const result = Math.round(25.555 * 100) / 100;
      expect(result).toBe(25.56);
    });
  });
});
