import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateInvoicePaymentsTable1716400000255 implements MigrationInterface {
  name = 'CreateInvoicePaymentsTable1716400000255';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'invoice_payments',
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
            name: 'payment_number',
            type: 'integer',
            isNullable: false,
            comment: 'Número de parcialidad (1, 2, 3...)',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'payment_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'payment_form',
            type: 'varchar',
            length: '5',
            isNullable: false,
            comment: 'Clave SAT forma de pago: 01=Efectivo, 03=Transferencia, 04=Tarjeta...',
          },
          {
            name: 'balance_before',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            comment: 'Saldo insoluto antes del pago',
          },
          {
            name: 'balance_after',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            comment: 'Saldo insoluto después del pago',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'stamped', 'cancelled'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'pack_complement_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'ID interno del complemento en el PAC',
          },
          {
            name: 'cfdi_complement_uuid',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: 'Folio fiscal SAT del complemento de pago',
          },
          {
            name: 'pack_complement_response',
            type: isPostgres ? 'jsonb' : 'json',
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
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'idx_invoice_payments_invoice_id',
            columnNames: ['invoice_id'],
          },
          {
            name: 'idx_invoice_payments_organization_id',
            columnNames: ['organization_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'invoice_payments',
      new TableForeignKey({
        columnNames: ['invoice_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'invoices',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invoice_payments',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('invoice_payments');
    const foreignKeys = table?.foreignKeys || [];
    await Promise.all(foreignKeys.map((fk) => queryRunner.dropForeignKey('invoice_payments', fk)));
    await queryRunner.dropTable('invoice_payments');
  }
}
