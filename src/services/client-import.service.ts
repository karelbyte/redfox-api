import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../models/client.entity';
import { ClientAddress, AddressType } from '../models/client-address.entity';
import { ClientTaxData } from '../models/client-tax-data.entity';
import { TenantContext } from './tenant-context.service';
import { ClientPackSyncService } from './client-pack-sync.service';

export interface ImportClientRow {
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

export interface ClientImportResult {
  created: number;
  skipped: number;
  pack_synced: number;
  pack_failed: number;
  errors: { row: number; code: string; name: string; reason: string }[];
  pack_warnings: { code: string; name: string; reason: string }[];
  summary: string;
}

@Injectable()
export class ClientImportService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ClientAddress)
    private readonly addressRepo: Repository<ClientAddress>,
    @InjectRepository(ClientTaxData)
    private readonly taxDataRepo: Repository<ClientTaxData>,
    private readonly tenantContext: TenantContext,
    private readonly clientPackSyncService: ClientPackSyncService,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  parseCSV(buffer: Buffer): ImportClientRow[] {
    const text = buffer
      .toString('utf-8')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2)
      throw new BadRequestException('El archivo no tiene datos suficientes');

    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/^"(.*)"$/, '$1'),
    );

    const rows: ImportClientRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = this.splitCSVLine(line, sep);
      const firstVal = (values[0] || '').trim().replace(/^"(.*)"$/, '$1').toLowerCase();
      // Saltar filas de metadatos de la plantilla
      if (this.isMetadataRow(firstVal)) continue;
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (values[idx] || '').trim().replace(/^"(.*)"$/, '$1');
      });

      rows.push({
        row: i + 1,
        code: obj['code'] || obj['codigo'] || '',
        name: obj['name'] || obj['nombre'] || '',
        description: obj['description'] || obj['descripcion'] || '',
        phone: obj['phone'] || obj['telefono'] || '',
        email: obj['email'] || obj['correo'] || '',
        status: obj['status'] || obj['estado'] || 'true',
        // Datos fiscales
        tax_document: obj['tax_document'] || obj['rfc'] || '',
        tax_name: obj['tax_name'] || obj['razon_social'] || '',
        tax_system: obj['tax_system'] || obj['regimen_fiscal'] || '',
        invoice_use: obj['invoice_use'] || obj['uso_cfdi'] || '',
        // Dirección
        address_zip:
          obj['address_zip'] || obj['codigo_postal'] || obj['cp'] || '',
        address_street: obj['address_street'] || obj['calle'] || '',
        address_city: obj['address_city'] || obj['ciudad'] || '',
        address_state: obj['address_state'] || obj['estado_dir'] || '',
        address_country: obj['address_country'] || obj['pais'] || '',
      });
    }
    return rows;
  }

  private isMetadataRow(firstVal: string): boolean {
    const metaValues = ['requerido', 'opcional', 'required', 'optional', '必填', '可选'];
    return metaValues.includes(firstVal) || firstVal.startsWith('tipo:') || firstVal.startsWith('type:');
  }

  private splitCSVLine(line: string, sep: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  async importRows(
    rows: ImportClientRow[],
    overrideOrgId?: string,
  ): Promise<ClientImportResult> {
    const orgId = overrideOrgId || this.organizationId;
    const result: ClientImportResult = {
      created: 0,
      skipped: 0,
      pack_synced: 0,
      pack_failed: 0,
      errors: [],
      pack_warnings: [],
      summary: '',
    };

    for (const row of rows) {
      try {
        // Validaciones requeridas
        if (!row.code?.trim()) {
          result.errors.push({
            row: row.row,
            code: '',
            name: row.name,
            reason: 'El campo "code" es requerido',
          });
          continue;
        }
        if (row.code.trim().length < 3 || row.code.trim().length > 50) {
          result.errors.push({
            row: row.row,
            code: row.code,
            name: row.name,
            reason: `El campo "code" debe tener entre 3 y 50 caracteres (tiene ${row.code.trim().length})`,
          });
          continue;
        }
        if (!row.name?.trim()) {
          result.errors.push({
            row: row.row,
            code: row.code,
            name: '',
            reason: 'El campo "name" es requerido',
          });
          continue;
        }
        if (row.name.trim().length < 3 || row.name.trim().length > 100) {
          result.errors.push({
            row: row.row,
            code: row.code,
            name: row.name,
            reason: `El campo "name" debe tener entre 3 y 100 caracteres (tiene ${row.name.trim().length})`,
          });
          continue;
        }

        if (row.email?.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email.trim())) {
            result.errors.push({
              row: row.row,
              code: row.code,
              name: row.name,
              reason: `El email "${row.email}" no tiene un formato válido`,
            });
            continue;
          }
        }

        const existing = await this.clientRepo.findOne({
          where: { code: row.code.trim(), organization_id: orgId },
        });
        if (existing) {
          result.errors.push({
            row: row.row,
            code: row.code,
            name: row.name,
            reason: `Código "${row.code}" ya existe — omitido para evitar duplicado`,
          });
          result.skipped++;
          continue;
        }

        const statusStr = (row.status || 'true').toLowerCase().trim();
        const status =
          statusStr === 'false' ||
          statusStr === '0' ||
          statusStr === 'inactivo' ||
          statusStr === 'inactive'
            ? false
            : true;

        const client = this.clientRepo.create({
          code: row.code.trim(),
          name: row.name.trim(),
          description: row.description?.trim() || row.name.trim(),
          phone: row.phone?.trim() || undefined,
          email: row.email?.trim() || undefined,
          status,
          organization_id: orgId,
        });

        const savedClient = await this.clientRepo.save(client);

        if (row.tax_document?.trim()) {
          const taxData = this.taxDataRepo.create({
            client_id: savedClient.id,
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
            client_id: savedClient.id,
            type: AddressType.BILLING,
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

        // Sincronizar al pack SOLO si tiene tax_document Y address_zip
        if (row.tax_document?.trim() && row.address_zip?.trim()) {
          try {
            const clientWithRelations = await this.clientRepo.findOne({
              where: { id: savedClient.id },
              relations: ['addresses', 'taxData'],
            });
            if (clientWithRelations) {
              const syncResult =
                await this.clientPackSyncService.syncOnCreate(
                  clientWithRelations,
                );
              if (syncResult.packSyncSuccess) {
                result.pack_synced++;
              } else {
                result.pack_failed++;
                result.pack_warnings.push({
                  code: row.code,
                  name: row.name,
                  reason:
                    syncResult.packErrorMessage ||
                    'Error al sincronizar con el pack',
                });
              }
            }
          } catch (syncErr: any) {
            result.pack_failed++;
            result.pack_warnings.push({
              code: row.code,
              name: row.name,
              reason: syncErr?.message || 'Error al sincronizar con el pack',
            });
          }
        }
      } catch (err: any) {
        result.errors.push({
          row: row.row,
          code: row.code || '',
          name: row.name || '',
          reason: err?.message || 'Error desconocido',
        });
      }
    }

    result.summary = `Importación completada: ${result.created} creados, ${result.skipped} omitidos (duplicados), ${result.errors.length} errores. Pack: ${result.pack_synced} sincronizados, ${result.pack_failed} fallidos.`;
    return result;
  }
}
