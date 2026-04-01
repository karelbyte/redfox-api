import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateWarehousesTable1716400000070 implements MigrationInterface {
  name = 'CreateWarehousesTable1716400000070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'warehouses',
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
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'address',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_open',
            type: 'boolean',
            default: true,
          },
          {
            name: 'currency_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
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
            name: 'IDX_WAREHOUSE_ORGANIZATION_CODE',
            columnNames: ['organization_id', 'code'],
            isUnique: true,
          },
        ],
      }),
      true,
    );

    // Crear foreign key para currency_id
    await queryRunner.createForeignKey(
      'warehouses',
      new TableForeignKey({
        columnNames: ['currency_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'currencies',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('warehouses');
    const foreignKeys = table?.foreignKeys || [];

    await Promise.all(
      foreignKeys.map((foreignKey) =>
        queryRunner.dropForeignKey('warehouses', foreignKey),
      ),
    );

    await queryRunner.dropTable('warehouses');
  }
}
