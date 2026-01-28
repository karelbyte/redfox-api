import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateInvoicesTable1716400000240 implements MigrationInterface {
  name = 'CreateInvoicesTable1716400000240';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'invoices',
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
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'date',
            type: isPostgres ? 'date' : 'date',
            isNullable: false,
          },
          {
            name: 'client_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'withdrawal_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: true,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 10,
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
            name: 'total_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['DRAFT', 'SENT', 'PAID', 'CANCELLED'],
            default: "'DRAFT'",
            isNullable: false,
          },
          {
            name: 'cfdi_uuid',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'pack_invoice_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'pack_invoice_response',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'payment_method',
            type: 'enum',
            enum: ['cash', 'card', 'transfer', 'check'],
            default: "'cash'",
            isNullable: false,
          },
          {
            name: 'payment_conditions',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
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
            name: 'idx_invoices_client_id',
            columnNames: ['client_id'],
          },
          {
            name: 'idx_invoices_withdrawal_id',
            columnNames: ['withdrawal_id'],
          },
          {
            name: 'idx_invoices_status',
            columnNames: ['status'],
          },
          {
            name: 'idx_invoices_cfdi_uuid',
            columnNames: ['cfdi_uuid'],
          },
          {
            name: 'idx_invoices_pack_invoice_id',
            columnNames: ['pack_invoice_id'],
          },
          {
            name: 'idx_invoices_date',
            columnNames: ['date'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'invoices',
      new TableForeignKey({
        columnNames: ['client_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clients',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invoices',
      new TableForeignKey({
        columnNames: ['withdrawal_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'withdrawals',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('invoices');
    const foreignKeys = table?.foreignKeys || [];

    await Promise.all(
      foreignKeys.map((foreignKey) =>
        queryRunner.dropForeignKey('invoices', foreignKey),
      ),
    );

    await queryRunner.dropTable('invoices');
  }
}
