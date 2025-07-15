import { DataSource } from 'typeorm';
import { Currency } from 'src/models/currency.entity';

export class CurrenciesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const currencyRepository = dataSource.getRepository(Currency);

    const currencies = [
      {
        code: 'USD',
        name: 'Dólar Estadounidense',
      },
      {
        code: 'EUR',
        name: 'Euro',
      },
      {
        code: 'MXN',
        name: 'Peso Mexicano',
      },
      {
        code: 'CAD',
        name: 'Dólar Canadiense',
      },
    ];

    for (const currency of currencies) {
      const existingCurrency = await currencyRepository.findOne({
        where: { code: currency.code },
      });

      if (!existingCurrency) {
        await currencyRepository.save(currency);
      }
    }
  }
} 