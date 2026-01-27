import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBarcodeToProductsTable1716400000270 implements MigrationInterface {
  name = 'AddBarcodeToProductsTable1716400000270';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'barcode',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('products', 'barcode');
  }
}
