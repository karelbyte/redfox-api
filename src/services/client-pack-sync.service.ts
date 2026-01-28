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

  async syncOnCreate(
    client: Client,
  ): Promise<{
    client: Client;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      const packService = await this.certificationPackFactory.getPackService();

      const customerData: CustomerData = {
        legal_name: client.name,
        tax_id: client.tax_document,
        tax_system: client.tax_system || undefined,
        email: client.email || undefined,
        phone: client.phone || undefined,
        default_invoice_use: client.default_invoice_use || undefined,
        address: {
          street: client.address_street || undefined,
          exterior: client.address_exterior || undefined,
          interior: client.address_interior || undefined,
          neighborhood: client.address_neighborhood || undefined,
          city: client.address_city || undefined,
          municipality: client.address_municipality || undefined,
          zip: client.address_zip || undefined,
          state: client.address_state || undefined,
          country: client.address_country || undefined,
        },
      };

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
   * - Si no tiene pack_client_id intenta crearlo en el pack.
   * - Si ya tiene pack_client_id lo actualiza en el pack.
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
        const customerData: CustomerData = {
          legal_name: client.name,
          tax_id: client.tax_document,
          tax_system: client.tax_system || undefined,
          email: client.email || undefined,
          phone: client.phone || undefined,
          default_invoice_use: client.default_invoice_use || undefined,
          address: {
            street: client.address_street || undefined,
            exterior: client.address_exterior || undefined,
            interior: client.address_interior || undefined,
            neighborhood: client.address_neighborhood || undefined,
            city: client.address_city || undefined,
            municipality: client.address_municipality || undefined,
            zip: client.address_zip || undefined,
            state: client.address_state || undefined,
            country: client.address_country || undefined,
          },
        };

        const packResponse = await packService.createCustomer(customerData);

        client.pack_client_id = packResponse.id;
        client.pack_client_response = packResponse;

        const savedClient = await this.clientRepository.save(client);

        return {
          client: savedClient,
          packSyncSuccess: true,
        };
      }

      // Si ya existe en el pack, construimos solo los campos cambiados
      const customerData: Partial<CustomerData> = {};

      if (updateClientDto.name) {
        customerData.legal_name = updateClientDto.name;
      }

      if (updateClientDto.tax_document) {
        customerData.tax_id = updateClientDto.tax_document;
      }

      if (updateClientDto.tax_system !== undefined) {
        customerData.tax_system = updateClientDto.tax_system;
      }

      if (updateClientDto.email !== undefined) {
        customerData.email = updateClientDto.email;
      }

      if (updateClientDto.phone !== undefined) {
        customerData.phone = updateClientDto.phone;
      }

      if (updateClientDto.default_invoice_use !== undefined) {
        customerData.default_invoice_use = updateClientDto.default_invoice_use;
      }

      // Solo incluir address si hay algún campo de dirección en el update
      if (
        updateClientDto.address_street !== undefined ||
        updateClientDto.address_exterior !== undefined ||
        updateClientDto.address_interior !== undefined ||
        updateClientDto.address_neighborhood !== undefined ||
        updateClientDto.address_city !== undefined ||
        updateClientDto.address_municipality !== undefined ||
        updateClientDto.address_zip !== undefined ||
        updateClientDto.address_state !== undefined ||
        updateClientDto.address_country !== undefined
      ) {
        customerData.address = {
          street:
            updateClientDto.address_street !== undefined
              ? updateClientDto.address_street
              : client.address_street || undefined,
          exterior:
            updateClientDto.address_exterior !== undefined
              ? updateClientDto.address_exterior
              : client.address_exterior || undefined,
          interior:
            updateClientDto.address_interior !== undefined
              ? updateClientDto.address_interior
              : client.address_interior || undefined,
          neighborhood:
            updateClientDto.address_neighborhood !== undefined
              ? updateClientDto.address_neighborhood
              : client.address_neighborhood || undefined,
          city:
            updateClientDto.address_city !== undefined
              ? updateClientDto.address_city
              : client.address_city || undefined,
          municipality:
            updateClientDto.address_municipality !== undefined
              ? updateClientDto.address_municipality
              : client.address_municipality || undefined,
          zip:
            updateClientDto.address_zip !== undefined
              ? updateClientDto.address_zip
              : client.address_zip || undefined,
          state:
            updateClientDto.address_state !== undefined
              ? updateClientDto.address_state
              : client.address_state || undefined,
          country:
            updateClientDto.address_country !== undefined
              ? updateClientDto.address_country
              : client.address_country || undefined,
        };
      }

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
}

