import {
  MigrationInterface,
  QueryRunner,
  Table,
  Index,
  ForeignKey,
} from 'typeorm';

export class CreateNotificationsTable1716400000320
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'info',
              'success',
              'warning',
              'error',
              'system',
              'order',
              'inventory',
              'sale',
              'quotation',
              'invoice',
            ],
            default: "'info'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'low'",
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'actionUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'actionLabel',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_notifications_userId_isRead',
            columnNames: ['userId', 'isRead'],
          },
          {
            name: 'IDX_notifications_userId_createdAt',
            columnNames: ['userId', 'createdAt'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
  }
}
