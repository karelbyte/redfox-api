import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateUserRolesTable1716400000020 implements MigrationInterface {
  name = 'CreateUserRoles1716400000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres =
      queryRunner.connection.driver.options.type === 'postgres';
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'user_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isPrimary: true,
          },
          {
            name: 'role_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_roles');
    const foreignKeys = table?.foreignKeys;

    if (foreignKeys) {
      await Promise.all(
        foreignKeys.map((foreignKey) =>
          queryRunner.dropForeignKey('user_roles', foreignKey),
        ),
      );
    }

    await queryRunner.dropTable('user_roles');
  }
}
