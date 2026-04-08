import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateProductTaxesTable1716400000085
  implements MigrationInterface
{
  name = 'CreateProductTaxesTable1716400000085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'product_taxes',
        columns: [
          {
            name: 'id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: isPostgres ? 'uuid_generate_v4()' : '(UUID())',
          },
          {
            name: 'product_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'tax_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Foreign key to products
    await queryRunner.createForeignKey(
      'product_taxes',
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key to taxes
    await queryRunner.createForeignKey(
      'product_taxes',
      new TableForeignKey({
        columnNames: ['tax_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'taxes',
        onDelete: 'CASCADE',
      }),
    );

    // Create unique index to prevent duplicate tax assignments
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_product_tax_unique" ON "product_taxes" ("product_id", "tax_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('product_taxes');

    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('product_taxes', foreignKey);
      }
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_tax_unique"`);
    await queryRunner.dropTable('product_taxes');
  }
}
