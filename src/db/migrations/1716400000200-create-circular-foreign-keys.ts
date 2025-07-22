import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
} from 'typeorm';

export class CreateCircularForeignKeys1716400000200 implements MigrationInterface {
  name = 'CreateCircularForeignKeys1716400000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Foreign key: withdrawals.cash_transaction_id -> cash_transactions.id
    await queryRunner.createForeignKey(
      'withdrawals',
      new TableForeignKey({
        columnNames: ['cash_transaction_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cash_transactions',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // Foreign key: cash_transactions.sale_id -> withdrawals.id
    await queryRunner.createForeignKey(
      'cash_transactions',
      new TableForeignKey({
        columnNames: ['sale_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'withdrawals',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key: cash_transactions.sale_id -> withdrawals.id
    const cashTransactionsTable = await queryRunner.getTable('cash_transactions');
    const cashTransactionsForeignKeys = cashTransactionsTable?.foreignKeys || [];
    
    for (const foreignKey of cashTransactionsForeignKeys) {
      if (foreignKey.columnNames.includes('sale_id')) {
        await queryRunner.dropForeignKey('cash_transactions', foreignKey);
      }
    }

    // Drop foreign key: withdrawals.cash_transaction_id -> cash_transactions.id
    const withdrawalsTable = await queryRunner.getTable('withdrawals');
    const withdrawalsForeignKeys = withdrawalsTable?.foreignKeys || [];
    
    for (const foreignKey of withdrawalsForeignKeys) {
      if (foreignKey.columnNames.includes('cash_transaction_id')) {
        await queryRunner.dropForeignKey('withdrawals', foreignKey);
      }
    }
  }
} 