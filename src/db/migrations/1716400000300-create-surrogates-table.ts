import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSurrogatesTable1716400000300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'surrogates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'prefix',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'suffix',
            type: 'varchar',
            length: '10',
            default: "''",
          },
          {
            name: 'next_number',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
          {
            name: 'padding',
            type: 'integer',
            default: 4,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    // Crear índice en el campo code para búsquedas rápidas
    await queryRunner.createIndex(
      'surrogates',
      new TableIndex({
        name: 'IDX_SURROGATES_CODE',
        columnNames: ['code'],
      }),
    );

    // Insertar datos iniciales
    await queryRunner.query(`
      INSERT INTO surrogates (code, prefix, next_number, padding, description) VALUES
      ('client', 'CLI', 1, 4, 'Códigos para clientes'),
      ('product', 'PROD', 1, 4, 'Códigos para productos'),
      ('invoice', 'INV', 1, 6, 'Códigos para facturas'),
      ('purchase_order', 'PO', 1, 4, 'Códigos para órdenes de compra'),
      ('sale', 'VTA', 1, 6, 'Códigos para ventas'),
      ('provider', 'PROV', 1, 4, 'Códigos para proveedores'),
      ('warehouse', 'ALM', 1, 3, 'Códigos para almacenes'),
      ('brand', 'MRC', 1, 3, 'Códigos para marcas'),
      ('category', 'CAT', 1, 3, 'Códigos para categorías'),
      ('reception', 'REC', 1, 4, 'Códigos para recepciones'),
      ('withdrawal', 'RET', 1, 4, 'Códigos para retiros'),
      ('return', 'DEV', 1, 4, 'Códigos para devoluciones')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('surrogates', 'IDX_SURROGATES_CODE');
    await queryRunner.dropTable('surrogates');
  }
}