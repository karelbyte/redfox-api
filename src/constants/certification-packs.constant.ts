export enum CertificationPackType {
  FACTURAAPI = 'FACTURAAPI',
  FACTURA_GREEN = 'FACTURA_GREEN',
  SAT = 'SAT',
}

export const CERTIFICATION_PACKS = {
  FACTURAAPI: CertificationPackType.FACTURAAPI,
  FACTURA_GREEN: CertificationPackType.FACTURA_GREEN,
  SAT: CertificationPackType.SAT,
} as const;
