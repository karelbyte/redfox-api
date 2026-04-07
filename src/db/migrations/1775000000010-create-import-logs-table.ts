import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateImportLogsTable1775000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'import_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['client', 'product', 'provider'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'completed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'total_rows',
            type: 'int',
            default: 0,
          },
          {
            name: 'created_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'skipped_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'error_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'pack_synced',
            type: 'int',
            default: 0,
          },
          {
            name: 'pack_failed',
            type: 'int',
            default: 0,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'errors',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'pack_warnings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_import_logs_org_type_created',
            columnNames: ['organization_id', 'type', 'created_at'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('import_logs');
  }
}
