import { DataSource } from 'typeorm';
import { Client } from 'src/models/client.entity';

export class ClientsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const clientRepository = dataSource.getRepository(Client);

    const clients = [
      {
        code: 'CLI001',
        name: 'Juan Pérez',
        tax_document: 'XAXX010101000',
        description: 'Cliente frecuente',
        address: 'Av. Reforma 123, CDMX',
        phone: '5551234567',
        email: 'juan.perez@email.com',
        status: true,
      },
      {
        code: 'CLI002',
        name: 'María García',
        tax_document: 'XAXX020202000',
        description: 'Cliente minorista',
        address: 'Calle Juárez 456, CDMX',
        phone: '5559876543',
        email: 'maria.garcia@email.com',
        status: true,
      },
      {
        code: 'CLI003',
        name: 'Empresa ABC, S.A. de C.V.',
        tax_document: 'ABC123456789',
        description: 'Cliente mayorista',
        address: 'Blvd. Manuel Ávila Camacho 789, CDMX',
        phone: '5551112233',
        email: 'contacto@empresaabc.com',
        status: true,
      },
    ];

    for (const client of clients) {
      const existingClient = await clientRepository.findOne({
        where: { code: client.code },
      });

      if (!existingClient) {
        await clientRepository.save(client);
      }
    }
  }
}
