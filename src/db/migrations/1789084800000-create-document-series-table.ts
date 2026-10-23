import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateDocumentSeriesTable1789084800000
  implements MigrationInterface
{
  name = 'CreateDocumentSeriesTable1789084800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'document_series',
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
            name: 'document_type',
            type: 'enum',
            enum: ['FACTURA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO'],
          },
          {
            name: 'series',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'current_number',
            type: 'int',
            default: 0,
          },
          {
            name: 'emitter_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
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
        indices: [
          new TableIndex({
            name: 'idx_document_series_org_type',
            columnNames: ['organization_id', 'document_type'],
          }),
          // SUNAT no admite que una misma serie se reutilice para otro tipo de
          // comprobante, así que la unicidad va por organización y serie.
          new TableIndex({
            name: 'idx_document_series_org_series_unique',
            columnNames: ['organization_id', 'series'],
            isUnique: true,
          }),
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'document_series',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    // Trazabilidad del comprobante emitido en la propia factura. Son columnas
    // nulables: las facturas que no usan series (CFDI mexicano) no cambian.
    await queryRunner.addColumns('invoices', [
      new TableColumn({
        name: 'document_type',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
      new TableColumn({
        name: 'series',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }),
      new TableColumn({
        name: 'number',
        type: 'int',
        isNullable: true,
      }),
    ]);

    // Una serie-número no se puede repetir dentro de la organización. Los
    // NULL no colisionan entre sí, así que las facturas sin serie conviven.
    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'idx_invoices_org_series_number_unique',
        columnNames: ['organization_id', 'series', 'number'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'invoices',
      'idx_invoices_org_series_number_unique',
    );
    await queryRunner.dropColumns('invoices', [
      'document_type',
      'series',
      'number',
    ]);
    await queryRunner.dropTable('document_series');
  }
}
