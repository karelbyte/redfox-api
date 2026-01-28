import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanySettings } from '../../models/company-settings.entity';
import { CompanySettingsResponseDto } from '../../dtos/company-settings/company-settings-response.dto';

@Injectable()
export class CompanySettingsMapper {
  constructor(private readonly configService: ConfigService) {}

  mapToResponseDto(settings: CompanySettings): CompanySettingsResponseDto {
    if (!settings) {
      throw new Error('CompanySettings cannot be null');
    }

    let logoUrl: string | null = settings.logoUrl ?? null;
    // Normalizar: los estáticos se sirven en /api/uploads (no /uploads) para no chocar con el prefijo global
    if (logoUrl?.startsWith('/uploads/') && !logoUrl.startsWith('/api/uploads/')) {
      logoUrl = `/api${logoUrl}`;
    }
    const publicUrl = this.configService.get<string>('APP_PUBLIC_URL');
    if (logoUrl && publicUrl && !logoUrl.startsWith('http')) {
      const base = publicUrl.replace(/\/$/, '');
      logoUrl = `${base}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
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
