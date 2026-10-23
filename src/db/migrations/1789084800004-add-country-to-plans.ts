import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * País al que pertenece un plan.
 *
 * Nulo significa "disponible en cualquier país", que es cómo se comportaban
 * todos los planes hasta ahora: al añadir la columna nadie pierde su plan.
 * Cuando existan planes en moneda local se marca cada uno con su país y el
 * reparto queda hecho.
 */
export class AddCountryToPlans1789084800004 implements MigrationInterface {
  name = 'AddCountryToPlans1789084800004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('plans', 'country')) {
      return;
    }

    await queryRunner.addColumn(
      'plans',
      new TableColumn({
        name: 'country',
        type: 'varchar',
        length: '2',
        isNullable: true,
        comment:
          'País del plan en ISO 3166-1 alpha-2. Nulo: disponible en cualquier país.',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('plans', 'country')) {
      await queryRunner.dropColumn('plans', 'country');
    }
  }
}
