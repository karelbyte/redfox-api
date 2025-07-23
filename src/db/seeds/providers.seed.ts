import { DataSource } from 'typeorm';
import { Provider } from 'src/models/provider.entity';

export class ProvidersSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const providerRepository = dataSource.getRepository(Provider);

    const providers = [
      {
        code: 'PROV001',
        name: 'Proveedor Mayorista A',
        document: 'PMA123456789',
        description: 'Proveedor de productos electrónicos',
        address: 'Av. Ejército Nacional 500, CDMX',
        phone: '5552223344',
        email: 'ventas@proveedora.com',
        status: true,
      },
      {
        code: 'PROV002',
        name: 'Distribuidora Industrial B',
        document: 'DIB987654321',
        description: 'Distribuidor de productos industriales',
        address: 'Av. Tamaulipas 200, CDMX',
        phone: '5553334455',
        email: 'contacto@distribuidorab.com',
        status: true,
      },
      {
        code: 'PROV003',
        name: 'Importadora C',
        document: 'IMP456789123',
        description: 'Importadora de productos varios',
        address: 'Blvd. Adolfo López Mateos 1000, CDMX',
        phone: '5554445566',
        email: 'importaciones@importadorac.com',
        status: true,
      },
    ];

    for (const provider of providers) {
      const existingProvider = await providerRepository.findOne({
        where: { code: provider.code },
      });

      if (!existingProvider) {
        await providerRepository.save(provider);
      }
    }
  }
}
