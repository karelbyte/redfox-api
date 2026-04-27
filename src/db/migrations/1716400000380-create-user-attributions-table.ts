import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserAttributionsTable1716400000380
  implements MigrationInterface
{
  name = 'CreateUserAttributionsTable1716400000380';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'user_attributions',
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
            name: 'user_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'attribution_type',
            type: 'enum',
            enum: ['WAREHOUSE', 'STORE', 'CATEGORY', 'CASH_REGISTER'],
            isNullable: false,
          },
          {
            name: 'resource_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'resource_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'permissions',
            type: isPostgres ? 'jsonb' : 'json',
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
          new TableIndex({
            name: 'idx_user_attributions_user_id',
            columnNames: ['user_id'],
          }),
          new TableIndex({
            name: 'idx_user_attributions_resource',
            columnNames: ['attribution_type', 'resource_id'],
          }),
          new TableIndex({
            name: 'idx_user_attributions_unique',
            columnNames: ['user_id', 'attribution_type', 'resource_id'],
            isUnique: true,
          }),
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'user_attributions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_attributions');
    const foreignKeys = table?.foreignKeys || [];

    await Promise.all(
      foreignKeys.map((foreignKey) =>
        queryRunner.dropForeignKey('user_attributions', foreignKey),
      ),
    );

    await queryRunner.dropTable('user_attributions');
  }
}
