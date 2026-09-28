import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Da de alta los planes de Perú y recién entonces marca los existentes como
 * mexicanos. El orden es lo único delicado de esta migración: los planes en
 * pesos están visibles para todo el mundo porque su país es nulo, así que si
 * se los restringiera primero, Perú se quedaría sin ningún plan que mostrar
 * durante el intervalo entre una sentencia y la otra.
 *
 * Los planes de Perú se cobran en dólares porque la cuenta de Stripe es
 * mexicana y no puede presentar soles. El banco del cliente hace la
 * conversión a su tasa, que es lo habitual en un servicio internacional.
 *
 * Importe y descripción quedan deliberadamente en blanco: la lista de
 * características y el texto se traducen en el front desde 1789084800003 y
 * 1789084800005, y el ahorro anual lo calcula la pantalla a partir de estos
 * precios. Doce meses a 49 contra 490 al año son dos meses de ahorro.
 */
const PERU_PLANS = [
  {
    name: 'Plan Mensual',
    price: '49.00',
    billing_period: 'monthly',
    lookup_key: 'nitro_pe_monthly',
    is_default: true,
  },
  {
    name: 'Plan Anual',
    price: '490.00',
    billing_period: 'yearly',
    lookup_key: 'nitro_pe_yearly',
    is_default: false,
  },
];

export class SeedPeruPlans1789084800007 implements MigrationInterface {
  name = 'SeedPeruPlans1789084800007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const plan of PERU_PLANS) {
      await queryRunner.query(
        `INSERT INTO plans
           (id, name, version, price, currency, billing_period, country,
            stripe_lookup_key, is_default, is_public, is_active)
         SELECT uuid_generate_v4(), $1::varchar, '1.0', $2::decimal, 'USD',
                $3::varchar, 'PE', $4::varchar, $5::boolean, true, true
         WHERE NOT EXISTS (
           SELECT 1 FROM plans WHERE stripe_lookup_key = $4::varchar
         )`,
        [plan.name, plan.price, plan.billing_period, plan.lookup_key, plan.is_default],
      );
    }

    // Solo ahora, con Perú ya cubierto, se restringen los planes en pesos.
    await queryRunner.query(
      `UPDATE plans SET country = 'MX' WHERE currency = 'MXN' AND country IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE plans SET country = NULL WHERE currency = 'MXN' AND country = 'MX'`,
    );

    // No se borra un plan que alguien ya contrató: dejaría la suscripción
    // apuntando al vacío. En ese caso se desactiva y se conserva.
    await queryRunner.query(
      `UPDATE plans SET is_active = false, is_public = false
       WHERE stripe_lookup_key = ANY($1)
         AND EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.plan_id = plans.id)`,
      [PERU_PLANS.map((p) => p.lookup_key)],
    );

    await queryRunner.query(
      `DELETE FROM plans
       WHERE stripe_lookup_key = ANY($1)
         AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.plan_id = plans.id)`,
      [PERU_PLANS.map((p) => p.lookup_key)],
    );
  }
}
