import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateExpensePaymentsTable1716500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'expense_payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'paymentDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'paymentMethod',
            type: 'enum',
            enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'other'],
            default: "'cash'",
            isNullable: false,
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
            name: 'expenseId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'uuid',
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
      true,
    );

    await queryRunner.createForeignKey(
      'expense_payments',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'expense_payments',
      new TableForeignKey({
        columnNames: ['expenseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'expenses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'expense_payments',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.query(`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "remainingAmount" DECIMAL(10, 2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE expenses 
      ALTER COLUMN "categoryId" DROP NOT NULL
    `);

    await queryRunner.query(`
      UPDATE expenses 
      SET "remainingAmount" = amount, 
          "paidAmount" = 0 
      WHERE "remainingAmount" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('expense_payments');
    
    await queryRunner.query(`
      ALTER TABLE expenses 
      DROP COLUMN IF EXISTS "paidAmount",
      DROP COLUMN IF EXISTS "remainingAmount"
    `);

    await queryRunner.query(`
      ALTER TABLE expenses 
      ALTER COLUMN "categoryId" SET NOT NULL
    `);
  }
}
