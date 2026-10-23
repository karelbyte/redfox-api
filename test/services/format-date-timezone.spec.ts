import { formatDateInTimeZone } from '../../src/utils/format.utils';
import { getCountryProfile } from '../../src/constants/countries.constant';

describe('formatDateInTimeZone', () => {
  const LIMA = getCountryProfile('PE').timeZone;
  const MEXICO = getCountryProfile('MX').timeZone;

  /**
   * El caso que rompió en producción: una venta a las 19:45 del 25 de
   * septiembre en Lima. En UTC ya son las 00:45 del 26, así que
   * `toISOString()` fechaba el comprobante al día siguiente y SUNAT lo
   * rechazaba con "puede ser hoy o hasta 5 días previos".
   */
  it('no adelanta el día en una venta de la tarde en Lima', () => {
    const venta = new Date('2026-09-26T00:45:00.000Z'); // 19:45 del 25 en Lima

    expect(venta.toISOString().slice(0, 10)).toBe('2026-09-26'); // el bug
    expect(formatDateInTimeZone(venta, LIMA)).toBe('2026-09-25'); // lo correcto
  });

  it('tampoco lo adelanta en México, que está una hora por delante', () => {
    const venta = new Date('2026-09-26T04:30:00.000Z'); // 22:30 del 25 en CDMX

    expect(formatDateInTimeZone(venta, MEXICO)).toBe('2026-09-25');
  });

  it('respeta el día en una venta de la mañana', () => {
    const venta = new Date('2026-09-25T14:00:00.000Z'); // 09:00 en Lima

    expect(formatDateInTimeZone(venta, LIMA)).toBe('2026-09-25');
  });

  /**
   * Una fecha que ya viene sin hora no representa un instante, así que
   * moverla de zona solo podría correrla un día sin motivo.
   */
  it('deja intacta una fecha que ya viene sin hora', () => {
    expect(formatDateInTimeZone('2026-09-25', LIMA)).toBe('2026-09-25');
    expect(formatDateInTimeZone('  2026-01-01  ', LIMA)).toBe('2026-01-01');
  });

  it('todos los países del registro declaran su zona horaria', () => {
    for (const code of ['PE', 'MX']) {
      const zona = getCountryProfile(code).timeZone;
      expect(zona).toBeTruthy();
      // Una zona inválida hace que Intl lance, así que esto la valida.
      expect(() => formatDateInTimeZone(new Date(), zona)).not.toThrow();
    }
  });
});
