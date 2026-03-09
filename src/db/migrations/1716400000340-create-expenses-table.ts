import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  Index,
} from 'typeorm';

export class CreateExpensesTable1716400000340 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'expenses',
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
            name: 'description',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'expenseDate',
            type: 'date',
          },
          {
            name: 'dueDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'recurrence',
            type: 'enum',
            enum: ['none', 'monthly', 'quarterly', 'yearly'],
            default: "'none'",
          },
          {
            name: 'receiptPath',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'providerId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'categoryId',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
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
      true,
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'expense_categories',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['providerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'providers',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('expenses');
  }
}
