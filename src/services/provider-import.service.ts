import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../models/provider.entity';
import { ProviderAddress, ProviderAddressType } from '../models/provider-address.entity';
import { ProviderTaxData } from '../models/provider-tax-data.entity';
import { TenantContext } from './tenant-context.service';

export interface ImportProviderRow {
  row: number;
  code: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  status?: string;
  // Datos fiscales (opcionales)
  tax_document?: string;
  tax_name?: string;
  tax_system?: string;
  invoice_use?: string;
  // Dirección (opcionales)
  address_zip?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
}

export interface ProviderImportResult {
  created: number;
  skipped: number;
  errors: { row: number; code: string; name: string; reason: string }[];
  summary: string;
}

@Injectable()
export class ProviderImportService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(ProviderAddress)
    private readonly addressRepo: Repository<ProviderAddress>,
    @InjectRepository(ProviderTaxData)
    private readonly taxDataRepo: Repository<ProviderTaxData>,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  parseCSV(buffer: Buffer): ImportProviderRow[] {
    const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new BadRequestException('El archivo no tiene datos suficientes');

    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h =>
      h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/^"(.*)"$/, '$1')
    );

    const rows: ImportProviderRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = this.splitCSVLine(line, sep);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (values[idx] || '').trim().replace(/^"(.*)"$/, '$1'); });

      rows.push({
        row: i + 1,
        code: obj['code'] || obj['codigo'] || '',
        name: obj['name'] || obj['nombre'] || '',
        description: obj['description'] || obj['descripcion'] || '',
        phone: obj['phone'] || obj['telefono'] || '',
        email: obj['email'] || obj['correo'] || '',
        status: obj['status'] || obj['estado'] || 'true',
        tax_document: obj['tax_document'] || obj['rfc'] || '',
        tax_name: obj['tax_name'] || obj['razon_social'] || '',
        tax_system: obj['tax_system'] || obj['regimen_fiscal'] || '',
        invoice_use: obj['invoice_use'] || obj['uso_cfdi'] || '',
        address_zip: obj['address_zip'] || obj['codigo_postal'] || obj['cp'] || '',
        address_street: obj['address_street'] || obj['calle'] || '',
        address_city: obj['address_city'] || obj['ciudad'] || '',
        address_state: obj['address_state'] || obj['estado_dir'] || '',
        address_country: obj['address_country'] || obj['pais'] || '',
      });
    }
    return rows;
  }

  private splitCSVLine(line: string, sep: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === sep && !inQuotes) { result.push(current); current = ''; }
      else { current += ch; }
    }
    result.push(current);
    return result;
  }

  async importRows(rows: ImportProviderRow[], overrideOrgId?: string): Promise<ProviderImportResult> {
    const orgId = overrideOrgId || this.organizationId;
    const result: ProviderImportResult = { created: 0, skipped: 0, errors: [], summary: '' };

    for (const row of rows) {
      try {
        if (!row.code?.trim()) {
          result.errors.push({ row: row.row, code: '', name: row.name, reason: 'El campo "code" es requerido' });
          continue;
        }
        if (row.code.trim().length < 3 || row.code.trim().length > 50) {
          result.errors.push({ row: row.row, code: row.code, name: row.name, reason: `El campo "code" debe tener entre 3 y 50 caracteres (tiene ${row.code.trim().length})` });
          continue;
        }
        if (!row.name?.trim()) {
          result.errors.push({ row: row.row, code: row.code, name: '', reason: 'El campo "name" es requerido' });
          continue;
        }
        if (row.name.trim().length < 3 || row.name.trim().length > 100) {
          result.errors.push({ row: row.row, code: row.code, name: row.name, reason: `El campo "name" debe tener entre 3 y 100 caracteres (tiene ${row.name.trim().length})` });
          continue;
        }
        if (row.email?.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email.trim())) {
            result.errors.push({ row: row.row, code: row.code, name: row.name, reason: `El email "${row.email}" no tiene un formato válido` });
            continue;
          }
        }

        const existing = await this.providerRepo.findOne({
          where: { code: row.code.trim(), organization_id: orgId },
        });
        if (existing) {
          result.errors.push({ row: row.row, code: row.code, name: row.name, reason: `Código "${row.code}" ya existe — omitido para evitar duplicado` });
          result.skipped++;
          continue;
        }

        const statusStr = (row.status || 'true').toLowerCase().trim();
        const status = !(statusStr === 'false' || statusStr === '0' || statusStr === 'inactivo' || statusStr === 'inactive');

        const provider = this.providerRepo.create({
          code: row.code.trim(),
          name: row.name.trim(),
          description: row.description?.trim() || row.name.trim(),
          phone: row.phone?.trim() || undefined,
          email: row.email?.trim() || undefined,
          status,
          organization_id: orgId,
        });

        const saved = await this.providerRepo.save(provider);

        if (row.tax_document?.trim()) {
          const taxData = this.taxDataRepo.create({
            provider_id: saved.id,
            tax_document: row.tax_document.trim().toUpperCase(),
            tax_name: row.tax_name?.trim() || row.name.trim(),
            tax_system: row.tax_system?.trim() || undefined,
            default_invoice_use: row.invoice_use?.trim() || undefined,
            is_main: true,
          });
          await this.taxDataRepo.save(taxData);
        }

        if (row.address_zip?.trim()) {
          const address = this.addressRepo.create({
            provider_id: saved.id,
            type: ProviderAddressType.FISCAL,
            zip_code: row.address_zip.trim(),
            street: row.address_street?.trim() || undefined,
            city: row.address_city?.trim() || undefined,
            state: row.address_state?.trim() || undefined,
            country: row.address_country?.trim() || 'MEX',
            is_main: true,
          });
          await this.addressRepo.save(address);
        }

        result.created++;
      } catch (err: any) {
        result.errors.push({
          row: row.row,
          code: row.code || '',
          name: row.name || '',
          reason: err?.message || 'Error desconocido',
        });
      }
    }

    result.summary = `Importación completada: ${result.created} creados, ${result.skipped} omitidos (duplicados), ${result.errors.length} errores.`;
    return result;
  }
}
