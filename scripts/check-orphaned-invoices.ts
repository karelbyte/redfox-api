import { DataSource } from 'typeorm';
import { Invoice } from '../src/models/invoice.entity';
import { Client } from '../src/models/client.entity';

/**
 * Script para verificar facturas con clientes inexistentes
 * Ejecutar con: npm run typeorm migration:run -- -d src/config/typeorm-cli.config.ts
 */
export class CheckOrphanedInvoices {
  public static async run(dataSource: DataSource): Promise<void> {
    const invoiceRepository = dataSource.getRepository(Invoice);
    const clientRepository = dataSource.getRepository(Client);

    console.log('🔍 Verificando facturas con clientes inexistentes...');

    // Buscar facturas con client_id que no existe en la tabla clients
    const orphanedInvoices = await invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.client', 'client')
      .where('client.id IS NULL')
      .getMany();

    if (orphanedInvoices.length === 0) {
      console.log('✅ No se encontraron facturas huérfanas');
      return;
    }

    console.log(`❌ Se encontraron ${orphanedInvoices.length} facturas huérfanas:`);
    
    for (const invoice of orphanedInvoices) {
      console.log(`  - Factura: ${invoice.code} (ID: ${invoice.id})`);
      
      // Obtener el client_id directamente de la base de datos
      const invoiceData = await invoiceRepository
        .createQueryBuilder('invoice')
        .select(['invoice.id', 'invoice.code'])
        .addSelect('invoice.client_id') // Seleccionar client_id directamente
        .where('invoice.id = :id', { id: invoice.id })
        .getRawOne();
      
      if (invoiceData && invoiceData.invoice_client_id) {
        const clientExists = await clientRepository.findOne({
          where: { id: invoiceData.invoice_client_id }
        });
        
        if (!clientExists) {
          console.log(`    ❌ Cliente con ID ${invoiceData.invoice_client_id} no existe en la tabla clients`);
        } else {
          console.log(`    ✅ Cliente existe pero la relación no se carga`);
        }
      }
    }

    console.log('🔍 Verificación completada');
  }
}
