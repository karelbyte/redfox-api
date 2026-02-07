import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateBookmarksTable1716400000390 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'bookmarks',
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
            name: 'entityName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
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
            name: 'IDX_bookmarks_userId',
            columnNames: ['userId'],
          },
          {
            name: 'IDX_bookmarks_entityType_entityId',
            columnNames: ['entityType', 'entityId'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'bookmarks',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bookmarks');
  }
}
