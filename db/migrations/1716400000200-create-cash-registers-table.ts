import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCashRegistersTable1716400000200 implements MigrationInterface {
  name = 'CreateCashRegistersTable1716400000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'cash_registers',
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
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'initial_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: '0.00',
          },
          {
            name: 'current_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: '0.00',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['open', 'closed'],
            default: "'closed'",
            isNullable: false,
          },
          {
            name: 'opened_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
          {
            name: 'closed_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
          {
            name: 'opened_by',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'closed_by',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
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
            name: 'idx_cash_registers_status',
            columnNames: ['status'],
          },
          {
            name: 'idx_cash_registers_opened_by',
            columnNames: ['opened_by'],
          },
          {
            name: 'idx_cash_registers_created_at',
            columnNames: ['created_at'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cash_registers');
  }
}
