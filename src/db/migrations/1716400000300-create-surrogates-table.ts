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
            name: 'organization_id',
            type: 'uuid',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
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
            name: 'include_year',
            type: 'boolean',
            default: false,
          },
          {
            name: 'year_separator',
            type: 'varchar',
            length: '10',
            default: "'-'",
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

    // Crear índice compuesto en los campos code y organization_id para búsquedas rápidas
    await queryRunner.createIndex(
      'surrogates',
      new TableIndex({
        name: 'IDX_SURROGATES_CODE_ORG',
        columnNames: ['code', 'organization_id'],
        isUnique: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "surrogates"
      ADD CONSTRAINT "FK_surrogates_organization_id"
      FOREIGN KEY ("organization_id")
      REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "surrogates" DROP CONSTRAINT "FK_surrogates_organization_id"`);
    await queryRunner.dropIndex('surrogates', 'IDX_SURROGATES_CODE_ORG');
    await queryRunner.dropTable('surrogates');
  }
}