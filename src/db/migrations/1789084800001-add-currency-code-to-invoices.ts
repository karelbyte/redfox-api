import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCurrencyCodeToInvoices1789084800001
  implements MigrationInterface
{
  name = 'AddCurrencyCodeToInvoices1789084800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'currency_code',
        type: 'varchar',
        length: '3',
        isNullable: true,
        comment:
          'Moneda del comprobante en ISO 4217 (PEN, USD...). Nulo usa la moneda por defecto del pack.',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('invoices', 'currency_code');
  }
}
