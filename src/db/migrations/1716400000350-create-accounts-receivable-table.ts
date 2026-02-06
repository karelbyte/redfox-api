import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAccountsReceivableTable1716400000350 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'accounts_receivable',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'referenceNumber',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'totalAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'paidAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'remainingAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'issueDate',
            type: 'date',
          },
          {
            name: 'dueDate',
            type: 'date',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'clientId',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
          },
          {
            name: 'invoiceId',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'accounts_receivable',
      new TableForeignKey({
        columnNames: ['clientId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clients',
        onDelete: 'RESTRICT',
      })
    );

    await queryRunner.createForeignKey(
      'accounts_receivable',
      new TableForeignKey({
        columnNames: ['invoiceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'invoices',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createIndex(
      'accounts_receivable',
      new TableIndex({
        name: 'IDX_accounts_receivable_status',
        columnNames: ['status']
      })
    );

    await queryRunner.createIndex(
      'accounts_receivable',
      new TableIndex({
        name: 'IDX_accounts_receivable_due_date',
        columnNames: ['dueDate']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('accounts_receivable');
  }
}