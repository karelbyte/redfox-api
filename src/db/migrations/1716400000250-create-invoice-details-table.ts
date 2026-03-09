import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateInvoiceDetailsTable1716400000250
  implements MigrationInterface
{
  name = 'CreateInvoiceDetailsTable1716400000250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'invoice_details',
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
            name: 'organization_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'invoice_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'tax_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'tax_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
            onUpdate: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'idx_invoice_details_org_invoice',
            columnNames: ['organization_id', 'invoice_id'],
          },
          {
            name: 'idx_invoice_details_org_product',
            columnNames: ['organization_id', 'product_id'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['invoice_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'invoices',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            columnNames: ['product_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'products',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('invoice_details');
  }
}
