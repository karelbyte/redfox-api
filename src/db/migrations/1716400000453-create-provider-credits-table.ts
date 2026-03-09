import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateProviderCreditsTable1716400000453
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'provider_credits',
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
            name: 'provider_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'credit_limit',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'credit_days',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'currency_id',
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
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'provider_credits',
      new TableForeignKey({
        columnNames: ['provider_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'providers',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'provider_credits',
      new TableForeignKey({
        columnNames: ['currency_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'currencies',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('provider_credits');
  }
}
