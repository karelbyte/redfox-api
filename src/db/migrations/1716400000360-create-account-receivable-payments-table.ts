import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateAccountReceivablePaymentsTable1716400000360 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'account_receivable_payments',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'paymentDate',
            type: 'date',
          },
          {
            name: 'paymentMethod',
            type: 'enum',
            enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'other'],
            default: "'cash'",
          },
          {
            name: 'reference',
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
            name: 'accountReceivableId',
            type: 'int',
          },
          {
            name: 'createdBy',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
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
      'account_receivable_payments',
      new TableForeignKey({
        columnNames: ['accountReceivableId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'accounts_receivable',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'account_receivable_payments',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('account_receivable_payments');
  }
}