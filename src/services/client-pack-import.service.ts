import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../models/client.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { CustomerResponse } from '../interfaces/certification-pack.interface';
import { ImportClientsFromPackResponseDto } from '../dtos/client/import-clients-from-pack-response.dto';
import { TranslationService } from './translation.service';

@Injectable()
export class ClientPackImportService {
  private readonly logger = new Logger(ClientPackImportService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly translationService: TranslationService,
  ) {}

  private async generateUniqueCode(base: string): Promise<string> {
    const normalized = base.slice(0, 50);
    const existing = await this.clientRepository.findOne({
      where: { code: normalized },
      withDeleted: true,
    });
    if (!existing) return normalized;

    const suffix = `-${Date.now()}`;
    return (normalized.slice(0, 50 - suffix.length) + suffix).slice(0, 50);
  }

  private mapPackCustomerToClientPatch(customer: CustomerResponse): Partial<Client> {
    const address = customer.address || {};
    return {
      name: customer.legal_name,
      tax_document: customer.tax_id,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      tax_system: (customer as any).tax_system || undefined,
      default_invoice_use: (customer as any).default_invoice_use || undefined,
      address_street: (address as any).street || undefined,
      address_exterior:
        (address as any).exterior !== undefined ? String((address as any).exterior) : undefined,
      address_interior:
        (address as any).interior !== undefined ? String((address as any).interior) : undefined,
      address_neighborhood: (address as any).neighborhood || undefined,
      address_city: (address as any).city || undefined,
      address_municipality: (address as any).municipality || undefined,
      address_zip:
        (address as any).zip !== undefined ? String((address as any).zip) : undefined,
      address_state: (address as any).state || undefined,
      address_country: (address as any).country || undefined,
      pack_client_id: customer.id,
      pack_client_response: customer as unknown as Record<string, unknown>,
      status: true,
    };
  }

  /**
   * Importa todos los clientes desde el pack activo hacia nuestra DB (proceso inverso).
   * Escalable: usa la abstracción del pack (listCustomers).
   */
  async importAllFromPack(userId?: string): Promise<ImportClientsFromPackResponseDto> {
    let packService: any;
    try {
      packService = await this.certificationPackFactory.getPackService();
    } catch (error: any) {
      const msg = await this.translationService.translate(
        'client.pack_not_configured',
        userId,
      );
      throw new BadRequestException(msg);
    }

    if (!packService?.listCustomers || typeof packService.listCustomers !== 'function') {
      const msg = await this.translationService.translate(
        'client.pack_list_not_supported',
        userId,
      );
      throw new BadRequestException(msg);
    }

    const customers: CustomerResponse[] = await packService.listCustomers();

    let created = 0;
    let updated = 0;
    let linked = 0;
    let skipped = 0;

    for (const customer of customers) {
      try {
        // 1) Match por pack_client_id
        let existing = await this.clientRepository.findOne({
          where: { pack_client_id: customer.id },
          withDeleted: false,
        });

        // 2) Match por tax_document si existe y no estaba vinculado
        if (!existing && customer.tax_id) {
          existing = await this.clientRepository.findOne({
            where: { tax_document: customer.tax_id },
            withDeleted: false,
          });
          if (existing && !existing.pack_client_id) {
            linked += 1;
          }
        }

        const patch = this.mapPackCustomerToClientPatch(customer);

        if (existing) {
          await this.clientRepository.save({
            ...existing,
            ...patch,
          });
          updated += 1;
          continue;
        }

        // Crear nuevo
        const codeBase = `PACK-${customer.id}`;
        const code = await this.generateUniqueCode(codeBase);
        const client = this.clientRepository.create({
          code,
          name: patch.name || 'Cliente',
          tax_document: patch.tax_document || 'N/A',
          description: 'Importado del pack',
          ...patch,
        });

        await this.clientRepository.save(client);
        created += 1;
      } catch (error: any) {
        skipped += 1;
        this.logger.warn(
          `Failed to import customer ${customer?.id} (${customer?.tax_id}): ${error?.message}`,
        );
      }
    }

    return {
      totalFromPack: customers.length,
      created,
      updated,
      linked,
      skipped,
    };
  }
}

