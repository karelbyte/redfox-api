import {
  resolveCustomerDocument,
  SunatIdentityDocument,
  NUMERO_SIN_DOCUMENTO,
  DIRECCION_NO_DECLARADA,
} from '../../src/constants/sunat-catalogs.constant';
import { DocumentType } from '../../src/models/document-series.entity';

describe('resolveCustomerDocument', () => {
  /**
   * El proveedor rechaza con 422 un número de menos de ocho caracteres. Se
   * enviaba un guion y toda venta de mostrador sin cliente identificado
   * fallaba: "El campo cliente numero de documento debe tener al menos 8
   * caracteres". Comprobado contra el sandbox de apisunat.
   */
  it('rellena con ocho ceros cuando el cliente no tiene documento', () => {
    const resuelto = resolveCustomerDocument(null);

    expect(resuelto).toEqual({
      identityDocument: SunatIdentityDocument.SIN_DOCUMENTO,
      documentType: DocumentType.BOLETA,
      number: '00000000',
    });
    expect(resuelto!.number.length).toBeGreaterThanOrEqual(8);
  });

  it('trata la cadena vacía y los espacios como ausencia de documento', () => {
    for (const entrada of ['', '   ', null, undefined]) {
      expect(resolveCustomerDocument(entrada)?.number).toBe(
        NUMERO_SIN_DOCUMENTO,
      );
    }
  });

  it('con RUC de 11 dígitos corresponde factura', () => {
    expect(resolveCustomerDocument('20123456789')).toEqual({
      identityDocument: SunatIdentityDocument.RUC,
      documentType: DocumentType.FACTURA,
      number: '20123456789',
    });
  });

  it('con DNI de 8 dígitos corresponde boleta', () => {
    expect(resolveCustomerDocument('12345678')).toEqual({
      identityDocument: SunatIdentityDocument.DNI,
      documentType: DocumentType.BOLETA,
      number: '12345678',
    });
  });

  it('rechaza un documento con letras o de largo inesperado', () => {
    for (const entrada of ['ABC12345', '123', '123456789012']) {
      expect(resolveCustomerDocument(entrada)).toBeNull();
    }
  });

  /**
   * El proveedor exige dirección incluso en una boleta a consumidor final.
   * Era el segundo error que su mensaje escondía tras "(y 1 error más)".
   */
  it('el relleno de dirección no es una cadena vacía', () => {
    expect(DIRECCION_NO_DECLARADA).not.toBe('');
    expect(DIRECCION_NO_DECLARADA.trim().length).toBeGreaterThan(0);
  });
});
