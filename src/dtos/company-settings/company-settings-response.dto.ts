export class CompanySettingsResponseDto {
  id: string;
  name: string | null;
  legalName: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
