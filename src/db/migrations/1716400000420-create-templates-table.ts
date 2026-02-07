import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTemplatesTable1716400000420 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.driver.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'templates',
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
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'entityType',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'data',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'isDefault',
            type: 'boolean',
            isNullable: false,
            default: false,
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
            name: 'IDX_templates_userId',
            columnNames: ['userId'],
          },
          {
            name: 'IDX_templates_entityType',
            columnNames: ['entityType'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'templates',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('templates');
  }
}
