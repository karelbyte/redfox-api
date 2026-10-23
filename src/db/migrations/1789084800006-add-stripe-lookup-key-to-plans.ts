import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Los planes pasan a encontrar su precio en Stripe por un nombre que elegimos
 * nosotros en vez de por el identificador que Stripe genera. La diferencia
 * importa al operar: si alguien borra un precio y lo vuelve a crear con el
 * mismo importe, el identificador cambia y la base queda apuntando a algo que
 * ya no existe; la clave se vuelve a asignar y todo sigue funcionando.
 *
 * También desacopla el despliegue: esta migración puede correr antes de que
 * los precios existan en Stripe, porque no necesita ningún dato de allá.
 */
const LOOKUP_KEYS: Array<{ currency: string; period: string; key: string }> = [
  { currency: 'MXN', period: 'monthly', key: 'nitro_mx_monthly' },
  { currency: 'MXN', period: 'yearly', key: 'nitro_mx_yearly' },
];

export class AddStripeLookupKeyToPlans1789084800006
  implements MigrationInterface
{
  name = 'AddStripeLookupKeyToPlans1789084800006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('plans', 'stripe_lookup_key');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'plans',
        new TableColumn({
          name: 'stripe_lookup_key',
          type: 'varchar',
          length: '255',
          isNullable: true,
          isUnique: true,
        }),
      );
    }

    for (const { currency, period, key } of LOOKUP_KEYS) {
      await queryRunner.query(
        `UPDATE plans SET stripe_lookup_key = $1
         WHERE currency = $2 AND billing_period = $3 AND stripe_lookup_key IS NULL`,
        [key, currency, period],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('plans', 'stripe_lookup_key');
    if (hasColumn) {
      await queryRunner.dropColumn('plans', 'stripe_lookup_key');
    }
  }
}
