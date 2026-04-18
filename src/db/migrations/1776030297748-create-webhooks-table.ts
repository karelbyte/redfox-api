import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateWebhooksTable1776030297748 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhooks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'url',
            type: 'text',
          },
          {
            name: 'event',
            type: 'enum',
            enum: [
              'sale_created',
              'invoice_created',
              'reception_created',
              'purchase_order_approved',
              'shipment_status_changed',
              'client_created',
              'product_created',
            ],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'failed'],
            default: "'active'",
          },
          {
            name: 'headers',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 3,
          },
          {
            name: 'timeout_ms',
            type: 'int',
            default: 5000,
          },
          {
            name: 'last_triggered_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failure_count',
            type: 'int',
            default: 0,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'webhooks',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhooks');
  }
}
