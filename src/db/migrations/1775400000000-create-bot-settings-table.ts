import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBotSettingsTable1775400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bot_settings',
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
            default: "'baileys'",
          },
          {
            name: 'connection_status',
            type: 'varchar',
            length: '50',
            default: "'disconnected'",
          },
          {
            name: 'is_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'auto_reply_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'quotation_mode_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'assistant_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'default_language',
            type: 'varchar',
            length: '10',
            default: "'es'",
          },
          {
            name: 'tone',
            type: 'varchar',
            length: '50',
            default: "'professional'",
          },
          {
            name: 'welcome_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'handoff_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'quotation_prompt',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cloud_config',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'connection_meta',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'qr_code',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'qr_expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_connected_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_error',
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
          },
        ],
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_bot_settings_org_unique',
            columnNames: ['organization_id'],
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bot_settings');
  }
}
