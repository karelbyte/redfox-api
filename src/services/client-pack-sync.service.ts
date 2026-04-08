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

    const data: CustomerData = {
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

    this.logger.log(
      `[extractCustomerData] client.id=${client.id} name="${client.name}" ` +
        `taxData count=${client.taxData?.length ?? 0} addresses count=${client.addresses?.length ?? 0}`,
    );
    this.logger.log(
      `[extractCustomerData] → CustomerData: ${JSON.stringify(data, null, 2)}`,
    );

    return data;
  }

  async syncOnCreate(client: Client): Promise<{
    client: Client;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    this.logger.log(
      `[syncOnCreate] START — client.id=${client.id} name="${client.name}"`,
    );

    try {
      const packService = await this.certificationPackFactory.getPackService();
      const customerData = this.extractCustomerData(client);

      this.logger.log(
        `[syncOnCreate] Calling createCustomer with payload: ${JSON.stringify(customerData, null, 2)}`,
      );

      const packResponse = await packService.createCustomer(customerData);

      this.logger.log(
        `[syncOnCreate] createCustomer RESPONSE: ${JSON.stringify(packResponse, null, 2)}`,
      );

      client.pack_client_id = packResponse.id;
      client.pack_client_response = packResponse;

      const savedClient = await this.clientRepository.save(client);

      this.logger.log(
        `[syncOnCreate] SUCCESS — pack_client_id=${packResponse.id}`,
      );

      return { client: savedClient, packSyncSuccess: true };
    } catch (error: any) {
      this.logger.warn(`[syncOnCreate] FAILED — ${error?.message}`);
      return {
        client,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }

  async syncOnUpdate(
    client: Client,
    updateClientDto: UpdateClientDto,
  ): Promise<{
    client: Client;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    this.logger.log(
      `[syncOnUpdate] START — client.id=${client.id} name="${client.name}" ` +
        `pack_client_id=${client.pack_client_id ?? 'none'}`,
    );

    try {
      const packService = await this.certificationPackFactory.getPackService();

      // Si el cliente aún no existe en el pack, crearlo
      if (!client.pack_client_id) {
        const customerData = this.extractCustomerData(client);

        this.logger.log(
          `[syncOnUpdate] No pack_client_id — calling createCustomer with payload: ${JSON.stringify(customerData, null, 2)}`,
        );

        const packResponse = await packService.createCustomer(customerData);

        this.logger.log(
          `[syncOnUpdate] createCustomer RESPONSE: ${JSON.stringify(packResponse, null, 2)}`,
        );

        client.pack_client_id = packResponse.id;
        client.pack_client_response = packResponse;

        const savedClient = await this.clientRepository.save(client);

        this.logger.log(
          `[syncOnUpdate] SUCCESS (create) — pack_client_id=${packResponse.id}`,
        );

        return { client: savedClient, packSyncSuccess: true };
      }

      // Si ya existe, actualizar
      const customerData = this.extractCustomerData(client);

      this.logger.log(
        `[syncOnUpdate] Calling updateCustomer pack_client_id=${client.pack_client_id} ` +
          `with payload: ${JSON.stringify(customerData, null, 2)}`,
      );

      const packResponse = await packService.updateCustomer(
        client.pack_client_id,
        customerData,
      );

      this.logger.log(
        `[syncOnUpdate] updateCustomer RESPONSE: ${JSON.stringify(packResponse, null, 2)}`,
      );

      client.pack_client_response = packResponse;

      const savedClient = await this.clientRepository.save(client);

      this.logger.log(
        `[syncOnUpdate] SUCCESS (update) — pack_client_id=${client.pack_client_id}`,
      );

      return { client: savedClient, packSyncSuccess: true };
    } catch (error: any) {
      this.logger.warn(`[syncOnUpdate] FAILED — ${error?.message}`);
      return {
        client,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }

  async syncManually(client: Client): Promise<{
    client: Client;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    this.logger.log(
      `[syncManually] START — client.id=${client.id} name="${client.name}" ` +
        `pack_client_id=${client.pack_client_id ?? 'none'}`,
    );

    try {
      const packService = await this.certificationPackFactory.getPackService();
      const customerData = this.extractCustomerData(client);

      if (client.pack_client_id) {
        this.logger.log(
          `[syncManually] Calling updateCustomer pack_client_id=${client.pack_client_id} ` +
            `with payload: ${JSON.stringify(customerData, null, 2)}`,
        );

        const packResponse = await packService.updateCustomer(
          client.pack_client_id,
          customerData,
        );

        this.logger.log(
          `[syncManually] updateCustomer RESPONSE: ${JSON.stringify(packResponse, null, 2)}`,
        );

        client.pack_client_response = packResponse;
        const savedClient = await this.clientRepository.save(client);

        this.logger.log(
          `[syncManually] SUCCESS (update) — pack_client_id=${client.pack_client_id}`,
        );

        return { client: savedClient, packSyncSuccess: true };
      }

      this.logger.log(
        `[syncManually] Calling createCustomer with payload: ${JSON.stringify(customerData, null, 2)}`,
      );

      const packResponse = await packService.createCustomer(customerData);

      this.logger.log(
        `[syncManually] createCustomer RESPONSE: ${JSON.stringify(packResponse, null, 2)}`,
      );

      client.pack_client_id = packResponse.id;
      client.pack_client_response = packResponse;

      const savedClient = await this.clientRepository.save(client);

      this.logger.log(
        `[syncManually] SUCCESS (create) — pack_client_id=${packResponse.id}`,
      );

      return { client: savedClient, packSyncSuccess: true };
    } catch (error: any) {
      this.logger.warn(`[syncManually] FAILED — ${error?.message}`);
      return {
        client,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }
}
