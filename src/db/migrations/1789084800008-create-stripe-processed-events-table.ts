import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Registro de los eventos de Stripe ya atendidos.
 *
 * Stripe reintenta la entrega hasta recibir un 2xx, y además no garantiza
 * entregar una sola vez: el mismo evento llega repetido con normalidad. Sin
 * este registro, una factura pagada se contabilizaría dos veces y el período
 * de la suscripción se extendería de más.
 *
 * La unicidad de event_id es la que hace el trabajo; la fila se inserta
 * después de atender el evento, para que un fallo a mitad de camino permita
 * el reintento en lugar de darlo por hecho.
 */
export class CreateStripeProcessedEventsTable1789084800008
  implements MigrationInterface
{
  name = 'CreateStripeProcessedEventsTable1789084800008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('stripe_processed_events');
    if (exists) return;

    await queryRunner.createTable(
      new Table({
        name: 'stripe_processed_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'event_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'processed_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stripe_processed_events', true);
  }
}
