import { Injectable } from '@nestjs/common';
import { CompanySettings } from '../../models/company-settings.entity';
import { CompanySettingsResponseDto } from '../../dtos/company-settings/company-settings-response.dto';

@Injectable()
export class CompanySettingsMapper {
  mapToResponseDto(settings: CompanySettings): CompanySettingsResponseDto {
    if (!settings) {
      throw new Error('CompanySettings cannot be null');
    }

    let logoUrl: string | null = settings.logoUrl ?? null;

    // Normalizar path local legacy: /uploads/ → /api/uploads/
    // Las URLs de S3 ya vienen absolutas (https://...) y no se tocan
    if (logoUrl && !logoUrl.startsWith('http') && logoUrl.startsWith('/uploads/')) {
      logoUrl = `/api${logoUrl}`;
    }

    return {
      id: settings.id,
      name: settings.name ?? null,
      legalName: settings.legalName ?? null,
      taxId: settings.taxId ?? null,
      address: settings.address ?? null,
      phone: settings.phone ?? null,
      email: settings.email ?? null,
      website: settings.website ?? null,
      logoUrl,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
