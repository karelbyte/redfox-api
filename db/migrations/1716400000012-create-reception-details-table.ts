import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateReceptionDetails1716400000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reception_details',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'reception_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'product_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
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

    await queryRunner.createForeignKey(
      'reception_details',
      new TableForeignKey({
        columnNames: ['reception_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'receptions',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'reception_details',
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reception_details');
    const foreignKeys = table?.foreignKeys;

    if (foreignKeys) {
      await Promise.all(
        foreignKeys.map((foreignKey) =>
          queryRunner.dropForeignKey('reception_details', foreignKey),
        ),
      );
    }

    await queryRunner.dropTable('reception_details');
  }
} 