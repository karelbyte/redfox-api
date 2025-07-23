import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePurchaseOrdersTable1716400000220 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'purchase_orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'date',
            type: 'date',
          },
          {
            name: 'provider_id',
            type: 'uuid',
          },
          {
            name: 'warehouse_id',
            type: 'uuid',
          },
          {
            name: 'document',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
            default: "'PENDING'",
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'expected_delivery_date',
            type: 'date',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['provider_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'providers',
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['warehouse_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'warehouses',
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('purchase_orders');
  }
} 