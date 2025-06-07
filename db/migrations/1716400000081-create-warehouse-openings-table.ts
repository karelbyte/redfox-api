import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateWarehouseOpeningsTable1716400000081
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'warehouse_openings',
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
            name: 'warehouse_id',
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
            default: 0,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: 0,
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
      true,
    );

    await queryRunner.createForeignKey(
      'warehouse_openings',
      new TableForeignKey({
        name: 'FK_WarehouseOpenings_Warehouses',
        columnNames: ['warehouse_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'warehouses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'warehouse_openings',
      new TableForeignKey({
        name: 'FK_WarehouseOpenings_Products',
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('warehouse_openings');
    const foreignKeys = table?.foreignKeys || [];

    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('warehouse_openings', foreignKey);
    }

    await queryRunner.dropTable('warehouse_openings');
  }
}
