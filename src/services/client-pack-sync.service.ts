import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../models/client.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { CustomerData } from '../interfaces/certification-pack.interface';
import { UpdateClientDto } from '../dtos/client/update-client.dto';

@Injectable()
export class ClientPackSyncService {
  private readonly logger = new Logger(ClientPackSyncService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  private extractCustomerData(client: Client): CustomerData {
    const mainTax =
      (client.taxData || []).find((t) => t.is_main) || client.taxData?.[0];
    const mainAddress =
      (client.addresses || []).find((a) => a.is_main) || client.addresses?.[0];

    return {
      legal_name: (mainTax?.tax_name || client.name)?.trim(),
      tax_id: mainTax?.tax_document || 'XAXX010101000',
      tax_system: mainTax?.tax_system || undefined,
      email: client.email || undefined,
      phone: client.phone || undefined,
      default_invoice_use: mainTax?.default_invoice_use || undefined,
      address: mainAddress
        ? {
            street: mainAddress.street || undefined,
            exterior: mainAddress.exterior_number || undefined,
            interior: mainAddress.interior_number || undefined,
            neighborhood: mainAddress.neighborhood || undefined,
            city: mainAddress.city || undefined,
            municipality: mainAddress.municipality || undefined,
            zip: mainAddress.zip_code || undefined,
            state: mainAddress.state || undefined,
            country: mainAddress.country || undefined,
          }
        : undefined,
    };
  }

  async syncOnCreate(client: Client): Promise<{
    client: Client;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      const packService = await this.certificationPackFactory.getPackService();
      const customerData = this.extractCustomerData(client);

      const packResponse = await packService.createCustomer(customerData);

      client.pack_client_id = packResponse.id;
      client.pack_client_response = packResponse;

      const savedClient = await this.clientRepository.save(client);

      return {
        client: savedClient,
        packSyncSuccess: true,
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to create client in certification pack: ${error?.message}`,
      );
      return {
        client,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }

  /**
   * Sincroniza un cliente actualizado con el pack activo.
   */
  async syncOnUpdate(
    client: Client,
    updateClientDto: UpdateClientDto,
  ): Promise<{
    client: Client;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      const packService = await this.certificationPackFactory.getPackService();

      // Si el cliente aún no existe en el pack, intentamos crearlo
      if (!client.pack_client_id) {
        const customerData = this.extractCustomerData(client);
        const packResponse = await packService.createCustomer(customerData);

        client.pack_client_id = packResponse.id;
        client.pack_client_response = packResponse;

        const savedClient = await this.clientRepository.save(client);

        return {
          client: savedClient,
          packSyncSuccess: true,
        };
      }

      // Si ya existe en el pack, construimos los datos finales basados en el estado actual del cliente
      // (Porque updateClientDto puede no contener todo y queremos enviar el estado actual "limpio")
      const customerData = this.extractCustomerData(client);

      const packResponse = await packService.updateCustomer(
        client.pack_client_id,
        customerData,
      );

      client.pack_client_response = packResponse;

      const savedClient = await this.clientRepository.save(client);

      return {
        client: savedClient,
        packSyncSuccess: true,
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to sync client with certification pack: ${error?.message}`,
      );
      return {
        client,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }

  /**
   * Sincroniza manualmente un cliente existente con el pack activo.
   * - Si el cliente NO tiene pack_client_id: Lo crea en el pack
   * - Si el cliente YA tiene pack_client_id: Actualiza sus datos en el pack
   */
  async syncManually(client: Client): Promise<{
    client: Client;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      const packService = await this.certificationPackFactory.getPackService();
      const customerData = this.extractCustomerData(client);

      // Si el cliente ya existe en el pack, actualizarlo
      if (client.pack_client_id) {
        const packResponse = await packService.updateCustomer(
          client.pack_client_id,
          customerData,
        );

        client.pack_client_response = packResponse;
        const savedClient = await this.clientRepository.save(client);

        return {
          client: savedClient,
          packSyncSuccess: true,
        };
      }

      // Si no existe, crearlo en el pack
      const packResponse = await packService.createCustomer(customerData);

      client.pack_client_id = packResponse.id;
      client.pack_client_response = packResponse;

      const savedClient = await this.clientRepository.save(client);

      return {
        client: savedClient,
        packSyncSuccess: true,
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to manually sync client with certification pack: ${error?.message}`,
      );
      return {
        client,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }
}
