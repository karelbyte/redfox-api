import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProductsTable1716400000080 implements MigrationInterface {
  name = 'CreateProductsTable1716400000080';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'products',
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
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'width',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'height',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'length',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'brand_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: true,
          },
          {
            name: 'category_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: true,
          },
          {
            name: 'measurement_unit_id',
            type: isPostgres ? 'varchar' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: true,
          },
          {
            name: 'tax_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['digital', 'service', 'tangible'],
            default: "'tangible'",
            isNullable: false,
          },
          {
            name: 'images',
            type: isPostgres ? 'text' : 'text',
            isNullable: true,
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
            name: 'FK_Products_Brands',
            columnNames: ['brand_id'],
            referencedTableName: 'brands',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_Products_Categories',
            columnNames: ['category_id'],
            referencedTableName: 'categories',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_Products_Taxes',
            columnNames: ['tax_id'],
            referencedTableName: 'taxes',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_Measurement_Unit',
            columnNames: ['measurement_unit_id'],
            referencedTableName: 'measurement_units',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('products');
  }
}
