import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCountryToOrganizations1789084800002
  implements MigrationInterface
{
  name = 'AddCountryToOrganizations1789084800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Todas las organizaciones existentes facturan en México: los únicos packs
    // implementados hasta ahora (Facturapi y Factura Green) son mexicanos.
    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'country',
        type: 'varchar',
        length: '2',
        isNullable: false,
        default: "'MX'",
        comment:
          'País de la organización en ISO 3166-1 alpha-2. Determina los packs de certificación y catálogos disponibles.',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('organizations', 'country');
  }
}
