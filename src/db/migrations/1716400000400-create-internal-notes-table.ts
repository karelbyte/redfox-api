import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateInternalNotesTable1716400000400 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'internal_notes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: isPostgres ? 'uuid_generate_v4()' : '(UUID())',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'entityType',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'entityId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'color',
            type: 'varchar',
            isNullable: true,
            default: "'#3B82F6'",
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
            name: 'IDX_internal_notes_userId',
            columnNames: ['userId'],
          },
          {
            name: 'IDX_internal_notes_entityType_entityId',
            columnNames: ['entityType', 'entityId'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'internal_notes',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('internal_notes');
  }
}
