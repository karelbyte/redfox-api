import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBotConversationTables1775451000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bot_conversations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'channel',
            type: 'varchar',
            length: '50',
            default: "'whatsapp'",
          },
          {
            name: 'customer_phone',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          {
            name: 'customer_jid',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'customer_name',
            type: 'varchar',
            length: '150',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
          },
          {
            name: 'current_step',
            type: 'varchar',
            length: '50',
            default: "'capture_product_query'",
          },
          {
            name: 'client_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'quotation_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'context_json',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'last_message_at',
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
          },
        ],
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['client_id'],
            referencedTableName: 'clients',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['quotation_id'],
            referencedTableName: 'quotations',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          {
            name: 'IDX_bot_conversations_lookup',
            columnNames: [
              'organization_id',
              'provider',
              'customer_phone',
              'status',
            ],
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'bot_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'conversation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'direction',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'message_text',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'detected_intent',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['conversation_id'],
            referencedTableName: 'bot_conversations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_bot_messages_conversation_created',
            columnNames: ['organization_id', 'conversation_id', 'created_at'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bot_messages');
    await queryRunner.dropTable('bot_conversations');
  }
}
