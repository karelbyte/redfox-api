import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateProductHistoryTable1716400000140
  implements MigrationInterface {
  name = 'CreateProductHistoryTable1716400000140';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'product_history',
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
            name: 'organization_id',
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
            name: 'warehouse_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'operation_type',
            type: 'enum',
            enum: [
              'WAREHOUSE_OPENING',
              'RECEPTION',
              'PURCHASE',
              'TRANSFER_IN',
              'ADJUSTMENT_IN',
              'RETURN_IN',
              'SALE',
              'WITHDRAWAL',
              'TRANSFER_OUT',
              'ADJUSTMENT_OUT',
              'DETERIORATION',
              'RETURN_OUT',
              'DAMAGE',
            ],
            isNullable: false,
            comment: 'Tipo específico de operación de inventario',
          },
          {
            name: 'operation_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
            comment:
              'ID de la operación origen (WarehouseOpening, Reception, Sale, etc.)',
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'current_stock',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            comment: 'Stock actual después de la operación',
          },
          {
            name: 'batch_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'expiration_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_PROD_HISTORY_ORG_DATE',
            columnNames: ['organization_id', 'created_at'],
          },
          {
            name: 'IDX_PROD_HISTORY_ORG_PRODUCT',
            columnNames: ['organization_id', 'product_id'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['product_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'products',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          {
            columnNames: ['warehouse_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'warehouses',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('product_history');
  }
}
