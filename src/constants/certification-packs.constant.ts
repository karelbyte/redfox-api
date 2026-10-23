export enum CertificationPackType {
  FACTURAAPI = 'FACTURAAPI',
  FACTURA_GREEN = 'FACTURA_GREEN',
  FACTURA_SUNAT = 'FACTURA_SUNAT',
}

export const CERTIFICATION_PACKS = {
  FACTURAAPI: CertificationPackType.FACTURAAPI,
  FACTURA_GREEN: CertificationPackType.FACTURA_GREEN,
  FACTURA_SUNAT: CertificationPackType.FACTURA_SUNAT,
} as const;
