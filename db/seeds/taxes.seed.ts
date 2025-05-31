import { DataSource } from 'typeorm';
import { Tax, TaxType } from '../../src/models/tax.entity';

export class TaxesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const taxRepository = dataSource.getRepository(Tax);

    const taxes = [
      {
        code: 'IVA',
        name: 'Impuesto al Valor Agregado',
        value: 16.00,
        type: TaxType.PERCENTAGE,
        isActive: true,
      },
      {
        code: 'IVA-0',
        name: 'IVA Tasa 0%',
        value: 0.00,
        type: TaxType.PERCENTAGE,
        isActive: true,
      },
      {
        code: 'IVA-8',
        name: 'IVA Tasa 8%',
        value: 8.00,
        type: TaxType.PERCENTAGE,
        isActive: true,
      },
      {
        code: 'ISR',
        name: 'Impuesto Sobre la Renta',
        value: 30.00,
        type: TaxType.PERCENTAGE,
        isActive: true,
      },
      {
        code: 'IEPS',
        name: 'Impuesto Especial sobre Producción y Servicios',
        value: 8.00,
        type: TaxType.PERCENTAGE,
        isActive: true,
      },
      {
        code: 'ISH',
        name: 'Impuesto Sobre Hospedaje',
        value: 3.00,
        type: TaxType.PERCENTAGE,
        isActive: true,
      },
      {
        code: 'IEPS-TABACO',
        name: 'IEPS Tabaco',
        value: 160.00,
        type: TaxType.FIXED,
        isActive: true,
      },
      {
        code: 'IEPS-BEBIDAS',
        name: 'IEPS Bebidas Alcohólicas',
        value: 26.50,
        type: TaxType.PERCENTAGE,
        isActive: true,
      },
      {
        code: 'IEPS-GASOLINA',
        name: 'IEPS Gasolina',
        value: 4.00,
        type: TaxType.PERCENTAGE,
        isActive: true,
      },
    ];

    for (const tax of taxes) {
      const existingTax = await taxRepository.findOne({
        where: { code: tax.code },
      });

      if (!existingTax) {
        await taxRepository.save(tax);
      }
    }
  }
}
