import { DataSource } from 'typeorm';
import { Tax, TaxType } from '../../models/tax.entity';

export class TaxesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const taxRepository = dataSource.getRepository(Tax);

    const taxes = [
      { code: 'IVA',  name: 'IVA 16%',  value: 16.0, type: TaxType.PERCENTAGE },
      { code: 'IVA',  name: 'IVA 0%',   value: 0.0,  type: TaxType.PERCENTAGE },
      { code: 'IVA',  name: 'IVA 8%',   value: 8.0,  type: TaxType.PERCENTAGE },
      { code: 'ISR',  name: 'ISR 30%',  value: 30.0, type: TaxType.PERCENTAGE },
      { code: 'IEPS', name: 'IEPS 8%',  value: 8.0,  type: TaxType.PERCENTAGE },
      { code: 'IEPS', name: 'IEPS Tabaco', value: 160.0, type: TaxType.FIXED },
      { code: 'IEPS', name: 'IEPS Bebidas Alcohólicas', value: 26.5, type: TaxType.PERCENTAGE },
      { code: 'IEPS', name: 'IEPS Gasolina', value: 4.0, type: TaxType.PERCENTAGE },
      { code: 'ISH',  name: 'ISH 3%',   value: 3.0,  type: TaxType.PERCENTAGE },
    ];

    for (const tax of taxes) {
      const existing = await taxRepository.findOne({
        where: { code: tax.code, value: tax.value },
      });
      if (!existing) {
        await taxRepository.save({ ...tax, isActive: true });
      }
    }
  }
}
