import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
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
            name: 'organization_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: false,
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
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'idx_invoices_organization_id',
            columnNames: ['organization_id'],
          },
          {
            name: 'idx_invoices_organization_code',
            columnNames: ['organization_id', 'code'],
            isUnique: true,
          },
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

    await queryRunner.addColumn(
      'withdrawals',
      new TableColumn({
        name: 'invoice_id',
        type: isPostgres ? 'uuid' : 'varchar',
        length: isPostgres ? undefined : '36',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'withdrawals',
      new TableForeignKey({
        columnNames: ['invoice_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'invoices',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const withdrawalsTable = await queryRunner.getTable('withdrawals');
    const withdrawalsFk = withdrawalsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('invoice_id') !== -1,
    );
    if (withdrawalsFk) {
      await queryRunner.dropForeignKey('withdrawals', withdrawalsFk);
    }
    await queryRunner.dropColumn('withdrawals', 'invoice_id');

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
