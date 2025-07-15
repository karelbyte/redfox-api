import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateWarehouseAdjustmentsTable1716400000180
  implements MigrationInterface
{
  name = 'CreateWarehouseAdjustmentsTable1716400000180';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'warehouse_adjustments',
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
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'source_warehouse_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'target_warehouse_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'boolean',
            default: true,
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
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'warehouse_adjustment_details',
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
            name: 'warehouse_adjustment_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
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
      }),
    );

    // Foreign keys for warehouse_adjustments
    await queryRunner.createForeignKey(
      'warehouse_adjustments',
      new TableForeignKey({
        columnNames: ['source_warehouse_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'warehouses',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'warehouse_adjustments',
      new TableForeignKey({
        columnNames: ['target_warehouse_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'warehouses',
        onDelete: 'RESTRICT',
      }),
    );

    // Foreign keys for warehouse_adjustment_details
    await queryRunner.createForeignKey(
      'warehouse_adjustment_details',
      new TableForeignKey({
        columnNames: ['warehouse_adjustment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'warehouse_adjustments',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'warehouse_adjustment_details',
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const warehouseAdjustmentsTable = await queryRunner.getTable(
      'warehouse_adjustments',
    );
    const warehouseAdjustmentDetailsTable = await queryRunner.getTable(
      'warehouse_adjustment_details',
    );

    if (warehouseAdjustmentDetailsTable) {
      const foreignKeys = warehouseAdjustmentDetailsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey(
          'warehouse_adjustment_details',
          foreignKey,
        );
      }
    }

    if (warehouseAdjustmentsTable) {
      const foreignKeys = warehouseAdjustmentsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('warehouse_adjustments', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('warehouse_adjustment_details');
    await queryRunner.dropTable('warehouse_adjustments');
  }
}
