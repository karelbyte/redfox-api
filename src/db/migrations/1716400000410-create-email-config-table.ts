import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEmailConfigTable1716400000410 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'host',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'port',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'user',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'fromEmail',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'fromName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'secure',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
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
        indices: [
          {
            name: 'IDX_email_configs_org_user',
            columnNames: ['organization_id', 'userId'],
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_configs');
  }
}
