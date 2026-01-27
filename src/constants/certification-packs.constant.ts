export enum CertificationPackType {
  FACTURAAPI = 'FACTURAAPI',
  SAT = 'SAT',
}

export const CERTIFICATION_PACKS = {
  FACTURAAPI: CertificationPackType.FACTURAAPI,
  SAT: CertificationPackType.SAT,
} as const;
