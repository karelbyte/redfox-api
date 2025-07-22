import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateCashTransactionsTable1716400000106
  implements MigrationInterface
{
  name = 'CreateCashTransactionsTable1716400000106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'cash_transactions',
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
            name: 'cash_register_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['sale', 'refund', 'adjustment', 'withdrawal', 'deposit'],
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
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'payment_method',
            type: 'enum',
            enum: ['cash', 'card', 'mixed'],
            default: "'cash'",
            isNullable: false,
          },
          {
            name: 'sale_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
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
            name: 'idx_cash_transactions_cash_register_id',
            columnNames: ['cash_register_id'],
          },
          {
            name: 'idx_cash_transactions_type',
            columnNames: ['type'],
          },
          {
            name: 'idx_cash_transactions_payment_method',
            columnNames: ['payment_method'],
          },
          {
            name: 'idx_cash_transactions_sale_id',
            columnNames: ['sale_id'],
          },
          {
            name: 'idx_cash_transactions_created_at',
            columnNames: ['created_at'],
          },
          {
            name: 'idx_cash_transactions_created_by',
            columnNames: ['created_by'],
          },
        ],
      }),
      true,
    );

    // Foreign key: cash_register_id -> cash_registers(id)
    await queryRunner.createForeignKey(
      'cash_transactions',
      new TableForeignKey({
        columnNames: ['cash_register_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cash_registers',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Foreign key: sale_id -> withdrawals(id) - Comentado temporalmente
    // await queryRunner.createForeignKey(
    //   'cash_transactions',
    //   new TableForeignKey({
    //     columnNames: ['sale_id'],
    //     referencedColumnNames: ['id'],
    //     referencedTableName: 'withdrawals',
    //     onDelete: 'SET NULL',
    //     onUpdate: 'CASCADE',
    //   }),
    // );

    // Foreign key: created_by -> users(id)
    await queryRunner.createForeignKey(
      'cash_transactions',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('cash_transactions');
    const foreignKeys = table?.foreignKeys || [];

    await Promise.all(
      foreignKeys.map((foreignKey) =>
        queryRunner.dropForeignKey('cash_transactions', foreignKey),
      ),
    );

    await queryRunner.dropTable('cash_transactions');
  }
} 