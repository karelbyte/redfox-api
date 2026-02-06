import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEmailConfigTable1707000000000 implements MigrationInterface {
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
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        indices: [
          {
            name: 'IDX_email_configs_userId',
            columnNames: ['userId'],
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
