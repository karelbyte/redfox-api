import { DataSource } from 'typeorm';
import { Invoice } from '../src/models/invoice.entity';

/**
 * Script para limpiar facturas huérfanas que no tienen cliente asociado
 * Ejecutar con: npm run typeorm migration:run -- -d src/config/typeorm-cli.config.ts
 */
export class CleanOrphanedInvoices {
  public static async run(dataSource: DataSource): Promise<void> {
    const invoiceRepository = dataSource.getRepository(Invoice);

    console.log('🧹 Limpiando facturas huérfanas sin cliente...');

    // Buscar facturas sin cliente
    const orphanedInvoices = await invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.client', 'client')
      .where('client.id IS NULL')
      .getMany();

    if (orphanedInvoices.length === 0) {
      console.log('✅ No se encontraron facturas huérfanas');
      return;
    }

    console.log(`📋 Se encontraron ${orphanedInvoices.length} facturas huérfanas:`);
    orphanedInvoices.forEach((invoice) => {
      console.log(`  - ${invoice.code} (ID: ${invoice.id})`);
    });

    // Eliminar facturas huérfanas
    const deletedCount = await invoiceRepository
      .createQueryBuilder()
      .delete()
      .from(Invoice)
      .where('client_id IS NULL')
      .execute();

    console.log(`🗑️ Se eliminaron ${deletedCount.affected} facturas huérfanas`);
    console.log('✅ Limpieza completada');
  }
}
