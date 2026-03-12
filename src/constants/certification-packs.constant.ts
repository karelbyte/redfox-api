export enum CertificationPackType {
  FACTURAAPI = 'FACTURAAPI',
  FACTURA_GREEN = 'FACTURA_GREEN',
}

export const CERTIFICATION_PACKS = {
  FACTURAAPI: CertificationPackType.FACTURAAPI,
  FACTURA_GREEN: CertificationPackType.FACTURA_GREEN,
} as const;
