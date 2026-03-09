import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateQuotationsTable1716400000310 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create quotations table
    await queryRunner.createTable(
      new Table({
        name: 'quotations',
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
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: false,
            isNullable: false,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'valid_until',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'client_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'warehouse_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'tax',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'draft',
              'sent',
              'accepted',
              'rejected',
              'expired',
              'converted',
            ],
            default: "'draft'",
          },
          {
            name: 'converted_to_sale_id',
            type: 'uuid',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create quotation_details table
    await queryRunner.createTable(
      new Table({
        name: 'quotation_details',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'quotation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'uuid',
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
            name: 'discount_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'discount_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create foreign keys for quotations table
    await queryRunner.createForeignKey(
      'quotations',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quotations',
      new TableForeignKey({
        columnNames: ['client_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clients',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quotations',
      new TableForeignKey({
        columnNames: ['warehouse_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'warehouses',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign keys for quotation_details table
    await queryRunner.createForeignKey(
      'quotation_details',
      new TableForeignKey({
        columnNames: ['quotation_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'quotations',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quotation_details',
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'quotations',
      new TableIndex({
        name: 'IDX_QUOTATIONS_ORGANIZATION_CODE',
        columnNames: ['organization_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'quotations',
      new TableIndex({
        name: 'IDX_QUOTATIONS_CLIENT_ID',
        columnNames: ['client_id'],
      }),
    );

    await queryRunner.createIndex(
      'quotations',
      new TableIndex({
        name: 'IDX_QUOTATIONS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'quotation_details',
      new TableIndex({
        name: 'IDX_QUOTATION_DETAILS_QUOTATION_ID',
        columnNames: ['quotation_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('quotations', 'IDX_QUOTATIONS_CODE');
    await queryRunner.dropIndex('quotations', 'IDX_QUOTATIONS_CLIENT_ID');
    await queryRunner.dropIndex('quotations', 'IDX_QUOTATIONS_STATUS');
    await queryRunner.dropIndex(
      'quotation_details',
      'IDX_QUOTATION_DETAILS_QUOTATION_ID',
    );

    // Drop foreign keys
    const quotationsTable = await queryRunner.getTable('quotations');
    const quotationDetailsTable =
      await queryRunner.getTable('quotation_details');

    if (quotationsTable) {
      const clientForeignKey = quotationsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('client_id') !== -1,
      );
      const warehouseForeignKey = quotationsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('warehouse_id') !== -1,
      );

      if (clientForeignKey) {
        await queryRunner.dropForeignKey('quotations', clientForeignKey);
      }
      if (warehouseForeignKey) {
        await queryRunner.dropForeignKey('quotations', warehouseForeignKey);
      }
    }

    if (quotationDetailsTable) {
      const quotationForeignKey = quotationDetailsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('quotation_id') !== -1,
      );
      const productForeignKey = quotationDetailsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('product_id') !== -1,
      );

      if (quotationForeignKey) {
        await queryRunner.dropForeignKey(
          'quotation_details',
          quotationForeignKey,
        );
      }
      if (productForeignKey) {
        await queryRunner.dropForeignKey(
          'quotation_details',
          productForeignKey,
        );
      }
    }

    // Drop tables
    await queryRunner.dropTable('quotation_details');
    await queryRunner.dropTable('quotations');
  }
}
