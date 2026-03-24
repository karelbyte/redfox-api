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
      name: customer.legal_name?.trim(),
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
          tax_name: customer.legal_name?.trim(),
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
    const organizationId = this.organizationId; // lanza si no hay contexto

    let packService: any;
    let activePack: any;
    try {
      activePack = await this.certificationPackFactory.getActivePack();
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

    let customers: CustomerResponse[];
    try {
      customers = await packService.listCustomers();
    } catch (error: any) {
      this.logger.error(`listCustomers failed: ${error?.message}`, error?.stack);
      throw new BadRequestException(error?.message || 'Error listing customers from pack');
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const customer of customers) {
      try {
        const existing = await this.clientRepository.findOne({
          where: { pack_client_id: customer.id, organization_id: organizationId },
          relations: ['addresses', 'taxData'],
          withDeleted: false,
        });

        const data = this.mapPackCustomerToClientData(customer);

        if (existing) {
          // Actualizar campos escalares del cliente
          existing.name = data.name;
          existing.email = data.email ?? existing.email;
          existing.phone = data.phone ?? existing.phone;
          existing.pack_client_response = data.pack_client_response;

          // Actualizar dirección principal si existe, o agregar si no hay
          if (data.addresses?.length > 0) {
            const newAddr = data.addresses[0];
            const mainAddr = existing.addresses?.find(a => a.is_main);
            if (mainAddr) {
              Object.assign(mainAddr, { ...newAddr, client_id: existing.id });
            } else {
              // No hay dirección principal — agregar con client_id ya asignado
              existing.addresses = [
                ...(existing.addresses || []),
                { ...newAddr, client_id: existing.id } as any,
              ];
            }
          }

          // Actualizar tax data principal si existe
          if (data.taxData?.length > 0) {
            const newTax = data.taxData[0];
            const mainTax = existing.taxData?.find((t: any) => t.is_main);
            if (mainTax) {
              Object.assign(mainTax, { ...newTax, client_id: existing.id });
            } else {
              existing.taxData = [
                ...(existing.taxData || []),
                { ...newTax, client_id: existing.id } as any,
              ];
            }
          }

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
