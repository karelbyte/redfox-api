import {
  resolveIgvAffectation,
  SunatIgvAffectation,
} from '../../src/constants/sunat-catalogs.constant';

/**
 * Reproduce la construcción de una línea tal como la hace
 * FacturaApisunatService.createItem, para fijar la regla sin tener que
 * levantar el servicio entero con sus diez dependencias.
 */
const declareIgv = (
  taxRate: number,
  productTaxes: Array<{ code: string; value: number }>,
  defaultIgv = 18,
) => {
  const tax = productTaxes.find((item) => Number(item.value) === taxRate);
  const affectation = resolveIgvAffectation(taxRate, tax?.code);
  const percentage =
    affectation === SunatIgvAffectation.GRAVADO ? taxRate || defaultIgv : 0;

  return { affectation, percentage };
};

describe('IGV declarado en una línea del comprobante', () => {
  const IGV_TAX = { code: 'IGV', value: 18 };
  const EXEMPT_TAX = { code: 'EXO', value: 0 };

  /**
   * El caso que rompió: la venta de mostrador guardó la línea con 0% pero el
   * producto tenía IGV 18% asignado. Se declaraba gravado al 18% y SUNAT
   * respondía "El campo total 7 no coincide con la sumatoria de los items
   * 8.26", porque el total de la factura no llevaba ese impuesto.
   */
  it('no declara 18% en una línea que cobró 0%', () => {
    const result = declareIgv(0, [IGV_TAX]);

    expect(result.percentage).toBe(0);
    expect(result.affectation).not.toBe(SunatIgvAffectation.GRAVADO);
  });

  it('declara 18% cuando la línea sí lo cobró', () => {
    expect(declareIgv(18, [IGV_TAX])).toEqual({
      affectation: SunatIgvAffectation.GRAVADO,
      percentage: 18,
    });
  });

  it('usa el impuesto del producto que coincide con la tasa de la línea', () => {
    expect(declareIgv(0, [IGV_TAX, EXEMPT_TAX]).affectation).toBe(
      SunatIgvAffectation.EXONERADO,
    );
    expect(declareIgv(18, [IGV_TAX, EXEMPT_TAX]).affectation).toBe(
      SunatIgvAffectation.GRAVADO,
    );
  });

  it('un producto sin impuestos deduce la afectación de la tasa', () => {
    expect(declareIgv(0, []).affectation).toBe(SunatIgvAffectation.EXONERADO);
    expect(declareIgv(18, []).affectation).toBe(SunatIgvAffectation.GRAVADO);
  });

  /**
   * El porcentaje por defecto solo existe para una línea gravada que, por lo
   * que sea, no trae tasa. Nunca para rellenar un cero legítimo.
   */
  it('el porcentaje por defecto no rescata una línea no gravada', () => {
    expect(declareIgv(0, [EXEMPT_TAX], 18).percentage).toBe(0);
  });

  /**
   * La comprobación que importa de verdad: lo declarado tiene que poder
   * reconstruir el total que se cobró. Es exactamente lo que valida SUNAT.
   */
  it('el total declarado cuadra con la suma de las líneas', () => {
    const lines = [
      { quantity: 2, unitValue: 2.0, taxRate: 0 },
      { quantity: 2, unitValue: 1.5, taxRate: 0 },
    ];
    const chargedTotal = 7.0;

    const sum = lines.reduce((acc, l) => {
      const { percentage } = declareIgv(l.taxRate, [IGV_TAX]);
      return acc + l.quantity * l.unitValue * (1 + percentage / 100);
    }, 0);

    expect(Number(sum.toFixed(2))).toBe(chargedTotal);
  });
});
