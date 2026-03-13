import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../models/client.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { CustomerResponse } from '../interfaces/certification-pack.interface';
import { ImportClientsFromPackResponseDto } from '../dtos/client/import-clients-from-pack-response.dto';
import { TranslationService } from './translation.service';
import { AddressType } from '../models/client-address.entity';
import { TenantContext } from './tenant-context.service';
import { SurrogateService } from './surrogate.service';

@Injectable()
export class ClientPackImportService {
  private readonly logger = new Logger(ClientPackImportService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly translationService: TranslationService,
    private readonly tenantContext: TenantContext,
    private readonly surrogateService: SurrogateService,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  private async generateUniqueCode(base: string): Promise<string> {
    const normalized = base.slice(0, 50);
    const existing = await this.clientRepository.findOne({
      where: { code: normalized, organization_id: this.organizationId },
      withDeleted: true,
    });
    if (!existing) return normalized;

    const suffix = `-${Date.now()}`;
    return (normalized.slice(0, 50 - suffix.length) + suffix).slice(0, 50);
  }

  private mapPackCustomerToClientData(customer: CustomerResponse): any {
    const address = customer.address || {};
    return {
      organization_id: this.organizationId,
      name: customer.legal_name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      addresses: [
        {
          is_main: true,
          type: AddressType.FISCAL,
          street: (address as any).street || undefined,
          exterior_number:
            (address as any).exterior !== undefined
              ? String((address as any).exterior)
              : undefined,
          interior_number:
            (address as any).interior !== undefined
              ? String((address as any).interior)
              : undefined,
          neighborhood: (address as any).neighborhood || undefined,
          city: (address as any).city || undefined,
          municipality: (address as any).municipality || undefined,
          zip_code:
            (address as any).zip !== undefined
              ? String((address as any).zip)
              : undefined,
          state: (address as any).state || undefined,
          country: (address as any).country || 'MEX',
        },
      ],
      taxData: [
        {
          is_main: true,
          tax_document: customer.tax_id,
          tax_name: customer.legal_name,
          tax_system: (customer as any).tax_system || undefined,
          default_invoice_use:
            (customer as any).default_invoice_use || undefined,
        },
      ],
      pack_client_id: customer.id,
      pack_client_response: customer as unknown as Record<string, unknown>,
      status: true,
    };
  }

  /**
   * Importa todos los clientes desde el pack activo hacia nuestra DB (proceso inverso).
   */
  async importAllFromPack(
    userId?: string,
  ): Promise<ImportClientsFromPackResponseDto> {
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

    if (
      !packService?.listCustomers ||
      typeof packService.listCustomers !== 'function'
    ) {
      const msg = await this.translationService.translate(
        'client.pack_list_not_supported',
        userId,
      );
      throw new BadRequestException(msg);
    }

    const customers: CustomerResponse[] = await packService.listCustomers();

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const customer of customers) {
      try {
        const existing = await this.clientRepository.findOne({
          where: { pack_client_id: customer.id },
          relations: ['addresses', 'taxData'],
          withDeleted: false,
        });

        const data = this.mapPackCustomerToClientData(customer);

        if (existing) {
          // Para actualizar, removemos las anteriores y agregamos las nuevas (simplificado para dev)
          // O podríamos intentar buscar la principal y actualizarla.
          // Por simplicidad en esta fase, reemplazamos:
          Object.assign(existing, data);
          await this.clientRepository.save(existing);
          updated += 1;
          continue;
        }

        // Crear nuevo cliente con código generado por surrogate
        const codeResponse = await this.surrogateService.useNextCode('client');
        const client = this.clientRepository.create({
          code: codeResponse.next_code,
          description: 'Importado del pack',
          ...data,
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
      linked: 0,
      skipped,
    };
  }
}
