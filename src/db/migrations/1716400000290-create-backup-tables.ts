import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBackupTables1716400000290 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'backup_configs',
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
            name: 'is_auto_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'frequency',
            type: 'varchar',
            length: '10',
            default: "'daily'",
          },
          {
            name: 'scheduled_time',
            type: 'varchar',
            length: '5',
            default: "'00:00'",
          },
          {
            name: 'retention_count',
            type: 'int',
            default: 7,
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
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'backup_logs',
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
            name: 'filename',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'file_size',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'boolean',
            default: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'trigger_type',
            type: 'varchar',
            length: '20',
            default: "'manual'",
          },
          {
            name: 'created_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('backup_logs');
    await queryRunner.dropTable('backup_configs');
  }
}
